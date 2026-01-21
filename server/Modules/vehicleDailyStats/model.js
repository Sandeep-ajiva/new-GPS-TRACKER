const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleDailyStatsSchema = {
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  gpsDeviceId:{type:mongoose.Schema.Types.ObjectId,ref:"GpsLiveData"},
  date: Date,
  totalDistance: Number,
  maxSpeed: Number,
  avgSpeed: Number,
  runningTime: Number,
  idleTime: Number,
  stoppedTime: Number,
  firstIgnitionOn: Date,
  lastIgnitionOff: Date,
  
};

module.exports = new ajModel("VehicleDailyStats", vehicleDailyStatsSchema).getModel();
