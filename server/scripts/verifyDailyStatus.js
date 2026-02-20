const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");

const GpsLiveData = require("../Modules/gpsLiveData/model");
const GpsHistory = require("../Modules/gpsHistory/model");
const VehicleDailyStats = require("../Modules/vehicleDailyStats/model");

const IMEI = "123456789012345";

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const live = await GpsLiveData.findOne({ imei: IMEI }).lean();
    const historyCount = await GpsHistory.countDocuments({ imei: IMEI });

    const day = new Date();
    day.setHours(0, 0, 0, 0);

    const daily = live?.vehicleId
      ? await VehicleDailyStats.findOne({
          vehicleId: live.vehicleId,
          date: day,
        }).lean()
      : null;

    console.log("\nVerification:");
    console.log(`IMEI: ${IMEI}`);
    console.log(`Live row: ${live ? "YES" : "NO"}`);
    console.log(`History count: ${historyCount}`);
    console.log(`Daily stats row: ${daily ? "YES" : "NO"}`);

    if (daily) {
      console.log(
        `Daily -> distance=${daily.totalDistance}, maxSpeed=${daily.maxSpeed}, running=${daily.runningTime}, idle=${daily.idleTime}, stopped=${daily.stoppedTime}`,
      );
    } else {
      console.log("No daily stats yet. Send location packets using testLocationHandler/chd first.");
    }
  } catch (err) {
    console.error("Verification failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
