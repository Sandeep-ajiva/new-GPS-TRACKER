const mongoose = require("mongoose");
const GpsLiveData = require("../Modules/gpsLiveData/model");
// Load env from current directory (since we run from server/)
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI;

async function checkDb() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to DB");

    const imei = "123456789012345";
    const data = await GpsLiveData.findOne({ imei });

    if (data) {
      console.log("✅ Data Found in DB:");
      console.log("--------------------------------------------------");
      console.log(`IMEI: ${data.imei}`);
      console.log(`Lat/Lng: ${data.latitude}, ${data.longitude}`);
      console.log(`Last Updated: ${data.gpsTimestamp}`);
      console.log(`Movement Status: ${data.movementStatus}`);
      console.log("--------------------------------------------------");
    } else {
      console.log("❌ No data found for IMEI:", imei);
    }
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.connection.close();
  }
}

checkDb();
