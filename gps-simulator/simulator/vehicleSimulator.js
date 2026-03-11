const net = require('net');
const config = require('../config');

class VehicleSimulator {
  constructor(vehicle, route) {
    this.vehicle = vehicle;
    this.route = route;
    this.socket = null;
    this.isLoggedIn = false;
    this.currentPointIndex = 0;
    this.isMoving = true;
    this.sendInterval = null;
    this.currentSpeed = 0;
    this.heading = 0;
    this.ignitionStatus = true;
    this.mileage = 0;
  }

  // Connect to TCP server
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = new net.Socket();
      
      this.socket.connect(config.TCP_PORT, config.TCP_HOST, () => {
        console.log(`🚗 Vehicle ${this.vehicle.vehicleNumber} connected to server`);
        this.setupEventHandlers();
        resolve();
      });

      this.socket.on('error', (err) => {
        console.error(`❌ Vehicle ${this.vehicle.vehicleNumber} connection error:`, err.message);
        reject(err);
      });
    });
  }

  // Setup socket event handlers
  setupEventHandlers() {
    this.socket.on('data', (data) => {
      const response = data.toString().trim();
      console.log(`📨 Vehicle ${this.vehicle.vehicleNumber} received: ${response}`);
      
      if (response === 'ON') {
        this.isLoggedIn = true;
        console.log(`✅ Vehicle ${this.vehicle.vehicleNumber} logged in successfully`);
        this.startSimulation();
      } else if (response === 'DENY') {
        console.log(`❌ Vehicle ${this.vehicle.vehicleNumber} login denied`);
        this.retryLogin();
      } else if (response === 'ACK') {
        // GPS data acknowledged
      }
    });

    this.socket.on('close', () => {
      console.log(`📴 Vehicle ${this.vehicle.vehicleNumber} disconnected`);
      this.isLoggedIn = false;
      if (this.sendInterval) {
        clearInterval(this.sendInterval);
      }
    });

    this.socket.on('error', (err) => {
      console.error(`❌ Vehicle ${this.vehicle.vehicleNumber} socket error:`, err.message);
    });
  }

  // Send login packet
  sendLogin() {
    const loginPacket = `$LGN,${this.vehicle.vehicleRegNo},${this.vehicle.imei},${this.vehicle.softwareVersion}*`;
    console.log(`🔐 Vehicle ${this.vehicle.vehicleNumber} sending login: ${loginPacket}`);
    this.socket.write(loginPacket + '\n');
  }

  // Retry login after delay
  retryLogin() {
    setTimeout(() => {
      if (!this.isLoggedIn) {
        console.log(`🔄 Vehicle ${this.vehicle.vehicleNumber} retrying login...`);
        this.sendLogin();
      }
    }, config.LOGIN_RETRY_DELAY);
  }

  // Start GPS simulation
  startSimulation() {
    if (!this.isLoggedIn) return;

    console.log(`🚀 Vehicle ${this.vehicle.vehicleNumber} starting GPS simulation`);
    
    // Send GPS data every 5 seconds
    this.sendInterval = setInterval(() => {
      this.sendGpsData();
    }, config.SEND_INTERVAL);

    // Send first GPS point immediately
    this.sendGpsData();
  }

  // Generate realistic GPS data
  sendGpsData() {
    if (!this.isLoggedIn || !this.isMoving) return;

    const currentPoint = this.route.points[this.currentPointIndex];
    const nextPoint = this.route.points[(this.currentPointIndex + 1) % this.route.points.length];

    // Calculate realistic speed
    this.currentSpeed = this.calculateRealisticSpeed(currentPoint.speed);
    
    // Calculate heading
    this.heading = this.calculateHeading(currentPoint, nextPoint);

    // Generate timestamp
    const now = new Date();
    const gpsDate = now.toISOString().slice(2, 10).replace(/-/g, '');
    const gpsTime = now.toTimeString().slice(0, 8).replace(/:/g, '');

    // Convert coordinates to AIS-140 format
    const latDeg = Math.floor(Math.abs(currentPoint.lat));
    const latMin = (Math.abs(currentPoint.lat) - latDeg) * 60;
    const latStr = `${latDeg}${latMin.toFixed(4).padStart(7, '0')}`;
    const latDir = currentPoint.lat >= 0 ? 'N' : 'S';

    const lngDeg = Math.floor(Math.abs(currentPoint.lng));
    const lngMin = (Math.abs(currentPoint.lng) - lngDeg) * 60;
    const lngStr = `${lngDeg}${lngMin.toFixed(4).padStart(7, '0')}`;
    const lngDir = currentPoint.lng >= 0 ? 'E' : 'W';

    // Generate status field (bit flags)
    const statusField = '0000'; // Will be enhanced with real status

    // Generate AIS-140 GPS packet
    const gpsPacket = `$NRM,${gpsDate},${gpsTime},${latStr},${latDir},${lngStr},${lngDir},${this.currentSpeed.toFixed(1)},${this.heading},8,150,1.2,0.8,airtel,404,4621,${this.mileage},${statusField},12.5,3.7,85,15,28,${now.toISOString()}*`;

    console.log(`📍 Vehicle ${this.vehicle.vehicleNumber} → GPS sent → ${currentPoint.lat.toFixed(4)}, ${currentPoint.lng.toFixed(4)} | Speed: ${this.currentSpeed} km/h`);
    
    this.socket.write(gpsPacket + '\n');

    // Update mileage
    this.mileage += (this.currentSpeed * config.SEND_INTERVAL) / 3600000; // Convert to km

    // Move to next point
    this.moveToNextPoint();
  }

  // Calculate realistic speed with variations
  calculateRealisticSpeed(baseSpeed) {
    const variation = (Math.random() - 0.5) * config.SPEED_VARIATION;
    const speed = baseSpeed + variation;
    
    // Random stop
    if (Math.random() < config.STOP_PROBABILITY) {
      this.isMoving = false;
      this.currentSpeed = 0;
      console.log(`🛑 Vehicle ${this.vehicle.vehicleNumber} stopped for traffic`);
      
      setTimeout(() => {
        this.isMoving = true;
        console.log(`🚗 Vehicle ${this.vehicle.vehicleNumber} resumed movement`);
      }, config.IDLE_TIME);
      
      return 0;
    }
    
    return Math.max(0, Math.min(120, speed)); // Clamp between 0-120 km/h
  }

  // Calculate heading between two points
  calculateHeading(point1, point2) {
    const lat1 = point1.lat * Math.PI / 180;
    const lat2 = point2.lat * Math.PI / 180;
    const lng1 = point1.lng * Math.PI / 180;
    const lng2 = point2.lng * Math.PI / 180;

    const y = Math.sin(lng2 - lng1) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1);

    const heading = Math.atan2(y, x) * 180 / Math.PI;
    return (heading + 360) % 360;
  }

  // Move to next point in route
  moveToNextPoint() {
    if (!this.isMoving) return;

    this.currentPointIndex++;
    
    // Loop route if completed
    if (this.currentPointIndex >= this.route.points.length) {
      if (config.ROUTE_LOOP) {
        this.currentPointIndex = 0;
        console.log(`🔄 Vehicle ${this.vehicle.vehicleNumber} completed route, restarting...`);
        
        // Delay before restarting
        this.isMoving = false;
        setTimeout(() => {
          this.isMoving = true;
        }, config.ROUTE_COMPLETION_DELAY);
      } else {
        console.log(`🏁 Vehicle ${this.vehicle.vehicleNumber} completed route`);
        this.stop();
      }
    }
  }

  // Stop simulation
  stop() {
    if (this.sendInterval) {
      clearInterval(this.sendInterval);
      this.sendInterval = null;
    }
    
    if (this.socket) {
      this.socket.end();
    }
    
    console.log(`🛑 Vehicle ${this.vehicle.vehicleNumber} simulation stopped`);
  }

  // Start the complete simulation
  async start() {
    try {
      await this.connect();
      this.sendLogin();
    } catch (error) {
      console.error(`❌ Failed to start vehicle ${this.vehicle.vehicleNumber}:`, error.message);
    }
  }
}

module.exports = VehicleSimulator;
