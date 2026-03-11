const mongoose = require("mongoose");
const VehicleModel = require("./Modules/vehicle/model");
const DriverModel = require("./Modules/drivers/model");

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || "your_mongodb_connection_string");

async function debugVehicles() {
  try {
    console.log("=== DEBUGGING VEHICLES AND DRIVERS ===\n");
    
    // 1. Check all vehicles
    const vehicles = await VehicleModel.find({}).populate('driverId');
    console.log(`Found ${vehicles.length} vehicles:\n`);
    
    vehicles.forEach((vehicle, index) => {
      console.log(`Vehicle ${index + 1}:`);
      console.log(`  ID: ${vehicle._id}`);
      console.log(`  Number: ${vehicle.vehicleNumber}`);
      console.log(`  DriverId: ${vehicle.driverId}`);
      
      if (vehicle.driverId) {
        console.log(`  Driver Details:`);
        console.log(`    Name: ${vehicle.driverId.firstName} ${vehicle.driverId.lastName}`);
        console.log(`    Phone: ${vehicle.driverId.phone || 'N/A'}`);
        console.log(`    Email: ${vehicle.driverId.email || 'N/A'}`);
        console.log(`    License: ${vehicle.driverId.licenseNumber || 'N/A'}`);
        console.log(`    Address: ${vehicle.driverId.address || 'N/A'}`);
      } else {
        console.log(`  Driver: NOT ASSIGNED`);
      }
      console.log('');
    });
    
    // 2. Check all drivers
    const drivers = await DriverModel.find({});
    console.log(`\n=== Found ${drivers.length} drivers in database ===\n`);
    
    drivers.forEach((driver, index) => {
      console.log(`Driver ${index + 1}:`);
      console.log(`  ID: ${driver._id}`);
      console.log(`  Name: ${driver.firstName} ${driver.lastName}`);
      console.log(`  Phone: ${driver.phone}`);
      console.log(`  Email: ${driver.email || 'N/A'}`);
      console.log(`  License: ${driver.licenseNumber}`);
      console.log(`  Address: ${driver.address || 'N/A'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error("Debug Error:", error);
  } finally {
    mongoose.connection.close();
  }
}

debugVehicles();
