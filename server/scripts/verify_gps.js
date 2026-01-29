const net = require("net");
const mongoose = require("mongoose");
require("dotenv").config();

// Configuration
const TCP_HOST = "127.0.0.1";
const TCP_PORT = process.env.TCP_PORT || 8800;
const MONGO_URI = process.env.MONGO_URI;
const TEST_IMEI = "123456789012345";
const TEST_REG_NO = "TS09ER1234";

async function verify() {
  console.log("🚀 Starting GPS Verification...");

  // 1. Connect to MongoDB to check device existence
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB Connection Failed:", err.message);
    return;
  }

  const GpsDevice = require("../Modules/gpsDevice/model");
  const GpsLiveData = require("../Modules/gpsLiveData/model");
  const GpsHistory = require("../Modules/gpsHistory/model");
  const Vehicle = require("../Modules/vehicle/model");
  const VehicleDeviceMapping = require("../Modules/vehicleMapping/model");

  const orgId = new mongoose.Types.ObjectId();

  let device = await GpsDevice.findOne({ imei: TEST_IMEI });
  if (!device) {
    console.log(`ℹ️ Creating test device with IMEI: ${TEST_IMEI}`);
    device = await GpsDevice.create({
      imei: TEST_IMEI,
      name: "Test Device",
      status: "active",
      softwareVersion: "1.0.0",
      organizationId: orgId,
    });
  }

  let vehicle = await Vehicle.findOne({ vehicleNumber: TEST_REG_NO });
  if (!vehicle) {
    console.log(`ℹ️ Creating test vehicle: ${TEST_REG_NO}`);
    vehicle = await Vehicle.create({
      vehicleNumber: TEST_REG_NO,
      vehicleType: "truck",
      organizationId: orgId,
      status: "active",
      createdBy: orgId, // Reuse orgId as a placeholder for user
    });
  }

  let mapping = await VehicleDeviceMapping.findOne({
    gpsDeviceId: device._id,
    unassignedAt: null,
  });
  if (!mapping) {
    console.log(
      `ℹ️ Creating test mapping for device ${TEST_IMEI} -> vehicle ${TEST_REG_NO}`,
    );
    await VehicleDeviceMapping.create({
      organizationId: orgId,
      vehicleId: vehicle._id,
      gpsDeviceId: device._id,
      assignedAt: new Date(),
    });
  }

  console.log("✅ Device, Vehicle and Mapping ready.");

  // 2. Connect to TCP Server
  const client = new net.Socket();

  client.connect(TCP_PORT, TCP_HOST, () => {
    console.log(`✅ Connected to TCP Server on ${TCP_HOST}:${TCP_PORT}`);

    // Send Login Packet (using one of the supported formats)
    const loginPacket = `##,${TEST_IMEI},0001,1.0\n`;
    console.log(`📤 Sending Login: ${loginPacket.trim()}`);
    client.write(loginPacket);
  });

  client.on("data", async (data) => {
    const response = data.toString().trim();
    console.log(`📥 Received: ${response}`);

    if (response === "ON" || response === "OK") {
      // Send NR Packet
      // Format: $NR,imei,date,time,lat,latDir,lng,lngDir,speed,heading,sats,...
      // Example matching your parser logic
      const now = new Date();
      const date = "290126"; // DDMMYY
      const time = "183000"; // HHMMSS
      const gpsPacket = `$NR,${TEST_IMEI},${date},${time},1250.1234,N,07730.1234,E,45.6,90,10,1,1,0,0,0,0001,100.5*FF\n`;

      console.log(`📤 Sending GPS Data: ${gpsPacket.trim()}`);
      client.write(gpsPacket);
    }

    if (response === "ACK") {
      console.log("✅ Data Acknowledged by server!");
      client.destroy(); // Close connection

      // Wait for DB write
      setTimeout(async () => {
        console.log("\n🔍 Verifying Database Records...");

        const live = await GpsLiveData.findOne({ imei: TEST_IMEI });
        if (live) {
          console.log("✅ GpsLiveData record updated!");
          console.log(`   IMEI: ${live.imei}`);
          console.log(`   Speed: ${live.currentSpeed}`);
          console.log(`   Lat/Lng: ${live.latitude}, ${live.longitude}`);
        } else {
          console.log("❌ GpsLiveData record NOT found!");
        }

        const history = await GpsHistory.findOne({ imei: TEST_IMEI }).sort({
          gpsTimestamp: -1,
        });
        if (history) {
          console.log("✅ GpsHistory record created!");
          console.log(`   Timestamp: ${history.gpsTimestamp}`);
        } else {
          console.log("❌ GpsHistory record NOT found!");
        }

        mongoose.connection.close();
        process.exit(0);
      }, 2000);
    }
  });

  client.on("error", (err) => {
    console.error("❌ TCP Client Error:", err.message);
    mongoose.connection.close();
    process.exit(1);
  });

  client.on("close", () => {
    console.log("📡 Connection closed");
  });
}

verify().catch((err) => {
  console.error("🔥 FATAL ERROR:", err);
  process.exit(1);
});
