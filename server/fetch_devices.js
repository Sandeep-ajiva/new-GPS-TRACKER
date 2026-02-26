const mongoose = require("mongoose");
const GpsDevice = require("./Modules/gpsDevice/model");
const VehicleDeviceMapping = require("./Modules/deviceMapping/model");
const Driver = require("./Modules/drivers/model");

async function checkDevices() {
    await mongoose.connect("mongodb+srv://Mandy123:Mandy12345@cluster0.gbgsz3f.mongodb.net/GPS?appName=Cluster0");
    const devices = await GpsDevice.find({ status: "active" }).lean();

    let validDevices = [];
    for (const device of devices) {
        const mapping = await VehicleDeviceMapping.findOne({ gpsDeviceId: device._id, unassignedAt: null }).lean();
        if (mapping && mapping.driverId) {
            const driver = await Driver.findOne({ _id: mapping.driverId }).lean();
            if (driver) {
                validDevices.push({
                    imei: device.imei,
                    deviceCode: device.deviceCode,
                    deviceId: device._id,
                    vehicleId: mapping.vehicleId,
                    driverId: driver._id
                });
            }
        }
    }

    console.log("Found Valid Devices:", JSON.stringify(validDevices.slice(0, 2), null, 2));
    process.exit(0);
}

checkDevices().catch(console.error);
