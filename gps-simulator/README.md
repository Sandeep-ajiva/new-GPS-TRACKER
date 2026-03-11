# GPS Fleet Management Simulator

A realistic GPS device simulator for testing your GPS Fleet Management system. This simulator generates AIS-140 compliant GPS packets and sends them to your backend via TCP connection.

## 🚀 Features

- **Realistic GPS Movement**: Vehicles move along predefined routes with realistic speeds
- **AIS-140 Protocol**: Compliant with AIS-140 GPS tracking standards
- **Multi-Vehicle Support**: Simulate 1-50 vehicles simultaneously
- **TCP Connection**: Connects to your existing TCP server (port 6000)
- **Route Simulation**: Vehicles follow real-world routes with waypoints
- **Speed Variations**: Realistic speed changes and occasional stops
- **Live Updates**: Sends GPS data every 5 seconds
- **Authentication**: Proper login handshake with backend

## 📁 Project Structure

```
gps-simulator/
├── index.js                 # Main entry point
├── config.js                # Configuration settings
├── package.json             # Node.js dependencies
├── README.md               # This file
├── vehicles/
│   └── vehicles.json       # Vehicle definitions
├── routes/
│   └── sample-routes.json  # Route definitions
└── simulator/
    ├── vehicleSimulator.js # Individual vehicle simulation
    └── simulatorManager.js # Multi-vehicle management
```

## 🛠️ Installation

No dependencies required! Uses built-in Node.js modules.

## 🚀 Quick Start

### 1. Start Your Backend Server
Make sure your GPS tracking server is running on port 6000:
```bash
cd server
npm start
```

### 2. Start GPS Simulator

#### Start All Vehicles (5 vehicles):
```bash
cd gps-simulator
node index.js
```

#### Start Specific Number of Vehicles:
```bash
# Start 3 vehicles
node index.js 3

# Start 10 vehicles
node index.js 10

# Start 50 vehicles
node index.js 50
```

## 📊 Sample Output

```
🚀 GPS Fleet Management Simulator
==================================

📊 Starting simulation for ALL vehicles...

📋 Loaded 5 vehicles and 5 routes
🚗 Vehicle HR26AB1234 connected to server
🔐 Vehicle HR26AB1234 sending login: $LGN,HR26AB1234,123456789012345,2.5AIS*
📨 Vehicle HR26AB1234 received: ON
✅ Vehicle HR26AB1234 logged in successfully
🚀 Vehicle HR26AB1234 starting GPS simulation
📍 Vehicle HR26AB1234 → GPS sent → 28.6139, 77.2090 | Speed: 45 km/h

📈 Status: 5 active | 5 moving | 0 stopped
```

## 🚗 Vehicle Configuration

Each vehicle in `vehicles/vehicles.json` includes:

```json
{
  "imei": "123456789012345",
  "vehicleNumber": "HR26AB1234",
  "driver": "Ramesh Kumar",
  "route": "delhi-gurgaon-route",
  "vehicleRegNo": "HR26AB1234",
  "softwareVersion": "2.5AIS"
}
```

### Available Vehicles:
1. **HR26AB1234** - Ramesh Kumar (Delhi-Gurgaon)
2. **DL01CD5678** - Suresh Sharma (Delhi-Noida)
3. **UP32EF9012** - Amit Singh (Delhi-Faridabad)
4. **RJ19GH3456** - Vikram Mehta (Delhi-Jaipur)
5. **GJ05XY7890** - Rahul Patel (Delhi-Ahmedabad)

## 🛣️ Route Configuration

Each route in `routes/sample-routes.json` includes:

```json
{
  "name": "delhi-gurgaon-route",
  "description": "Delhi to Gurgaon route via NH48",
  "points": [
    {
      "lat": 28.6139,
      "lng": 77.2090,
      "speed": 40,
      "name": "Connaught Place"
    }
  ]
}
```

### Available Routes:
- **delhi-gurgaon-route**: Delhi to Gurgaon (15 waypoints)
- **delhi-noida-route**: Delhi to Noida (15 waypoints)
- **delhi-faridabad-route**: Delhi to Faridabad (15 waypoints)
- **delhi-jaipur-route**: Delhi to Jaipur (15 waypoints)
- **delhi-ahmedabad-route**: Delhi to Ahmedabad (20 waypoints)

## ⚙️ Configuration

Edit `config.js` to customize:

```javascript
module.exports = {
  TCP_HOST: 'localhost',        // Server host
  TCP_PORT: 6000,               // Server port
  SEND_INTERVAL: 5000,          // GPS update interval (ms)
  SPEED_VARIATION: 10,          // Speed variation (±km/h)
  STOP_PROBABILITY: 0.1,        // Stop probability (10%)
  IDLE_TIME: 30000,             // Idle time when stopped (ms)
  ROUTE_LOOP: true,             // Loop routes continuously
  ROUTE_COMPLETION_DELAY: 5000  // Delay before restarting route (ms)
};
```

## 📡 Protocol Details

### Login Packet:
```
$LGN,VEHICLE_REG,IMEI,SOFTWARE_VERSION*
```

### GPS Packet (AIS-140):
```
$NRM,DATE,TIME,LATITUDE,N/S,LONGITUDE,E/W,SPEED,HEADING,SATELLITES,ALTITUDE,PDOP,HDOP,OPERATOR,MCC,MNC,MILEAGE,STATUS,VOLTAGE,BATTERY,SIGNAL,FUEL,TEMP,TIMESTAMP*
```

### Example GPS Packet:
```
$NRM,240521,123045,2859.1234,N,07712.3456,E,45.0,120,8,150,1.2,0.8,airtel,404,4621,123.45,0000,12.5,3.7,85,15,28,2024-05-21T12:30:45Z*
```

## 🎯 Testing Features

The simulator tests:

### ✅ Live Tracking
- Real-time vehicle positions on map
- Speed and heading updates
- Vehicle status (online/offline)

### ✅ History Playback
- Complete route history stored
- Timeline playback functionality
- GPS point-by-point tracking

### ✅ Daily Statistics
- Total distance traveled
- Average and maximum speeds
- Active vs idle time

### ✅ Notifications
- Ignition on/off alerts
- Speed violations
- Geofence crossings

### ✅ Vehicle Movement
- Realistic acceleration/deceleration
- Traffic stops and starts
- Route completion and looping

## 🔧 Customization

### Add New Vehicles:
1. Edit `vehicles/vehicles.json`
2. Add new vehicle with unique IMEI
3. Assign existing or new route

### Add New Routes:
1. Edit `routes/sample-routes.json`
2. Define waypoints with coordinates
3. Set target speeds for each waypoint

### Modify Behavior:
1. Edit `config.js` for timing
2. Edit `simulator/vehicleSimulator.js` for logic
3. Add new packet types if needed

## 🐛 Troubleshooting

### Connection Issues:
- Ensure backend server is running on port 6000
- Check firewall settings
- Verify TCP server is listening

### Login Issues:
- Check IMEI exists in database
- Verify device status is "active"
- Ensure proper vehicle-device mapping

### No GPS Data:
- Verify login was successful (check "ON" response)
- Check route configuration
- Review console logs for errors

## 📞 Support

For issues with:
- **Simulator**: Check this README and console logs
- **Backend**: Review server logs and database
- **Frontend**: Check browser console and network requests

## 🚀 Advanced Usage

### High Volume Testing:
```bash
# Test with 50 vehicles
node index.js 50

# Monitor performance
node index.js 50 | tee simulation.log
```

### Custom Scenarios:
```bash
# Edit config.js for faster updates
SEND_INTERVAL: 1000  # 1 second updates

# Edit vehicles.json for custom vehicles
# Edit routes.json for custom routes
```

### Integration Testing:
```bash
# Start backend
cd server && npm start

# Start simulator (new terminal)
cd gps-simulator && node index.js 10

# Test frontend
# Open browser and check live tracking
```

---

**Happy Testing! 🚗📍**
