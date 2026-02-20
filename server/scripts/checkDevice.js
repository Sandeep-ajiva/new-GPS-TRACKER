/**
 * Quick script to check if device exists in database
 */

require("dotenv").config();
const mongoose = require("mongoose");
const GpsDevice = require("../Modules/gpsDevice/model");

const IMEI = "123456789012345";

async function checkDevice() {
  try {
    console.log("🔍 Connecting to database...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected\n");

    console.log(`🔍 Looking for device with IMEI: ${IMEI}`);
    const device = await GpsDevice.findOne({ imei: IMEI });

    if (!device) {
      console.log("❌ Device NOT found in database");
      console.log("\n💡 You need to create this device first!");
      console.log("   Either:");
      console.log("   1. Use the admin panel to add a GPS device");
      console.log("   2. Or run a script to insert test data\n");
    } else {
      console.log("✅ Device found!");
      console.log(JSON.stringify(device, null, 2));
      console.log("\nStatus:", device.status);
      console.log("Organization:", device.organizationId);
      console.log("Vehicle:", device.vehicleId);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDevice();
