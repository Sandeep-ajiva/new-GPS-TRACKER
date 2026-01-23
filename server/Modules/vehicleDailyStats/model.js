const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleDailyStatsSchema = {
  // 🔗 Relations
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },

  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
    index: true,
  },

  gpsDeviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GpsLiveData",
    required: true,
  },

  // 📅 Date for which stats are calculated
  date: {
    type: Date,
    required: true,
    index: true,
  },

  // 📏 Distance & Speed (units assumed: km & km/h)
  totalDistance: {
    type: Number,
    default: 0,
    min: 0,
  },

  maxSpeed: {
    type: Number,
    default: 0,
    min: 0,
  },

  avgSpeed: {
    type: Number,
    default: 0,
    min: 0,
  },

  // ⏱ Time metrics (stored in seconds)
  runningTime: {
    type: Number,
    default: 0,
    min: 0,
  },

  idleTime: {
    type: Number,
    default: 0,
    min: 0,
  },

  stoppedTime: {
    type: Number,
    default: 0,
    min: 0,
  },

  // 🔑 Ignition Events
  firstIgnitionOn: {
    type: Date,
    default: null,
  },

  lastIgnitionOff: {
    type: Date,
    default: null,
  },
};

// 🚀 Optional but highly recommended
// // Prevent duplicate daily records for same vehicle
// vehicleDailyStatsSchema.index(
//   { vehicleId: 1, date: 1 },
//   { unique: true }
// );

module.exports = new ajModel(
  "VehicleDailyStats",
  vehicleDailyStatsSchema
).getModel();
