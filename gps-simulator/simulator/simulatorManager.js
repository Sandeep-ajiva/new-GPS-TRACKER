const VehicleSimulator = require('./vehicleSimulator');
const config = require('../config');

class SimulatorManager {
  constructor() {
    this.vehicles = [];
    this.routes = [];
    this.simulators = [];
  }

  // Load vehicles and routes
  async loadData() {
    try {
      const vehiclesData = require('../vehicles/vehicles.json');
      const routesData = require('../routes/sample-routes.json');
      
      this.vehicles = vehiclesData;
      this.routes = routesData;
      
      console.log(`📋 Loaded ${this.vehicles.length} vehicles and ${this.routes.length} routes`);
    } catch (error) {
      console.error('❌ Failed to load data:', error.message);
      process.exit(1);
    }
  }

  // Create route lookup map
  getRouteMap() {
    const routeMap = {};
    this.routes.forEach(route => {
      routeMap[route.name] = route;
    });
    return routeMap;
  }

  // Start simulation for all vehicles
  async startAll() {
    await this.loadData();
    const routeMap = this.getRouteMap();
    
    console.log(`🚀 Starting GPS simulation for ${this.vehicles.length} vehicles...\n`);
    
    // Create simulator for each vehicle
    this.vehicles.forEach(vehicle => {
      const route = routeMap[vehicle.route];
      if (!route) {
        console.error(`❌ Route '${vehicle.route}' not found for vehicle ${vehicle.vehicleNumber}`);
        return;
      }
      
      const simulator = new VehicleSimulator(vehicle, route);
      this.simulators.push(simulator);
    });

    // Start all simulators with staggered delay
    this.simulators.forEach((simulator, index) => {
      setTimeout(() => {
        simulator.start();
      }, index * 2000); // Start each vehicle 2 seconds apart
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down simulators...');
      this.stopAll();
      process.exit(0);
    });
  }

  // Start simulation for specific number of vehicles
  async startVehicleCount(count) {
    await this.loadData();
    const routeMap = this.getRouteMap();
    
    const vehiclesToSimulate = this.vehicles.slice(0, Math.min(count, this.vehicles.length));
    
    console.log(`🚀 Starting GPS simulation for ${vehiclesToSimulate.length} vehicles...\n`);
    
    vehiclesToSimulate.forEach(vehicle => {
      const route = routeMap[vehicle.route];
      if (!route) {
        console.error(`❌ Route '${vehicle.route}' not found for vehicle ${vehicle.vehicleNumber}`);
        return;
      }
      
      const simulator = new VehicleSimulator(vehicle, route);
      this.simulators.push(simulator);
    });

    // Start all simulators with staggered delay
    this.simulators.forEach((simulator, index) => {
      setTimeout(() => {
        simulator.start();
      }, index * 2000); // Start each vehicle 2 seconds apart
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down simulators...');
      this.stopAll();
      process.exit(0);
    });
  }

  // Stop all simulators
  stopAll() {
    this.simulators.forEach(simulator => {
      simulator.stop();
    });
    this.simulators = [];
    console.log('✅ All simulators stopped');
  }

  // Get simulation status
  getStatus() {
    const activeSimulators = this.simulators.filter(sim => sim.isLoggedIn);
    const movingVehicles = activeSimulators.filter(sim => sim.isMoving);
    
    return {
      total: this.simulators.length,
      active: activeSimulators.length,
      moving: movingVehicles.length,
      stopped: activeSimulators.length - movingVehicles.length
    };
  }
}

module.exports = SimulatorManager;
