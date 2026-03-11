#!/usr/bin/env node

const SimulatorManager = require('./simulator/simulatorManager');

// Parse command line arguments
const args = process.argv.slice(2);
const vehicleCount = args[0] ? parseInt(args[0]) : null;

console.log('🚀 GPS Fleet Management Simulator');
console.log('==================================');
console.log('');

// Create and start simulator
const manager = new SimulatorManager();

if (vehicleCount && vehicleCount > 0) {
  console.log(`📊 Starting simulation for ${vehicleCount} vehicle(s)...\n`);
  manager.startVehicleCount(vehicleCount);
} else {
  console.log(`📊 Starting simulation for ALL vehicles...\n`);
  manager.startAll();
}

// Show status every 30 seconds
setInterval(() => {
  const status = manager.getStatus();
  console.log(`📈 Status: ${status.active} active | ${status.moving} moving | ${status.stopped} stopped`);
}, 30000);

console.log('');
console.log('📝 Usage:');
console.log('   node index.js           - Start all vehicles');
console.log('   node index.js 5         - Start 5 vehicles');
console.log('   node index.js 10        - Start 10 vehicles');
console.log('');
console.log('⚡ Press Ctrl+C to stop simulation');
console.log('');
