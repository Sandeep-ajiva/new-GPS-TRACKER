const mongoose = require("mongoose");
const GpsDevice = require("./Modules/gpsDevice/model");
const VehicleDeviceMapping = require("./Modules/deviceMapping/model");
const Driver = require("./Modules/drivers/model");
const Vehicle = require("./Modules/vehicle/model");

async function checkData() {
    await mongoose.connect("mongodb+srv://Mandy123:Mandy12345@cluster0.gbgsz3f.mongodb.net/GPS?appName=Cluster0");

    const devices = await GpsDevice.find().limit(5).lean();
    console.log("--- 5 DEVICES ---");
    console.log(JSON.stringify(devices, null, 2));

    const mappings = await VehicleDeviceMapping.find().limit(5).lean();
    console.log("--- 5 MAPPINGS ---");
    console.log(JSON.stringify(mappings, null, 2));

    const drivers = await Driver.find().limit(5).lean();
    console.log("--- 5 DRIVERS ---");
    console.log(JSON.stringify(drivers, null, 2));

    process.exit(0);
}

checkData().catch(console.error);
