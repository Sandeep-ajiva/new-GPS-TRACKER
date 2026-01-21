require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const GpsDevice = require('../Modules/gpsDevice/model');
const VehicleDeviceMapping = require('../Modules/deviceMapping/model');

// Connect to DB
connectDB();

const checkData = async () => {
    try {
        console.log("🔍 Checking for valid test data...\n");

        // 1. Find all Devices
        const devices = await GpsDevice.find({ isActive: true }).limit(5);
        if (devices.length === 0) {
            console.log("❌ No Active GPS Devices found in DB.");
            console.log("👉 Please create a Device via your API or Compass first.");
            process.exit(0);
        }

        console.log(`✅ Found ${devices.length} Active Devices. Checking mappings...\n`);

        let validImei = null;

        for (const device of devices) {
            // 2. Check Mapping
            const mapping = await VehicleDeviceMapping.findOne({
                gpsDeviceId: device._id,
                unassignedAt: null
            });

            if (mapping) {
                console.log(`🟢 Valid Setup Found!`);
                console.log(`   - IMEI: ${device.imei}`);
                console.log(`   - Device ID: ${device._id}`);
                console.log(`   - Vehicle ID: ${mapping.vehicleId}`);
                validImei = device.imei;
                break; // Found one, that's enough for testing
            } else {
                console.log(`-------`);
                console.log(`⚠️  Device (IMEI: ${device.imei}) is NOT assigned to a vehicle.`);
            }
        }

        if (validImei) {
            console.log("\n🚀 YOU CAN USE THIS IMEI FOR TESTING:");
            console.log(`   "${validImei}"`);
        } else {
            console.log("\n❌ No Devices are currently assigned to Vehicles.");
            console.log("👉 You must assign a device to a vehicle before the TCP server will accept data.");
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        // We can't easily close the connection if connectDB manages it globally, 
        // but for a script process.exit is fine after a brief pause
        setTimeout(() => process.exit(0), 1000);
    }
};

checkData();
