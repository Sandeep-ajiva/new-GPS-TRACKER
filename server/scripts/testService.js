const mongoose = require("mongoose");
const Service = require("../Modules/gpsLiveData/service");
require("dotenv").config();

async function testService() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to DB");

    const payload = {
      packetType: "NR",
      imei: "123456789012345",
      gpsDate: "04022026",
      gpsTime: "120000",
      latitude: 17.44008,
      longitude: 78.348916,
      currentSpeed: 45.5,
      heading: 45.0,
      numberOfSatellites: 10,
      ignitionStatus: true,
      currentMileage: 10500,
      gpsTimestamp: new Date(),
      movementStatus: "running",
      checksum: "7A",
      // Add other fields being parsed
      altitude: 500,
      pdop: 1.0,
      hdop: 1.0,
      operatorName: "Airtel",
    };

    console.log("🚀 Calling Service.processGpsData...");
    const result = await Service.processGpsData(payload);

    console.log("✅ Result:", result);

    if (!result.success) {
      console.error("❌ Service Failed:", result.message);
    }
  } catch (err) {
    console.error("🔥 EXCEPTION:", err);
  } finally {
    mongoose.connection.close();
  }
}

testService();
