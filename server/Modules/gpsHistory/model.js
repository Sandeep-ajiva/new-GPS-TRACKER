const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const gpsHistorySchema = {
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
  },

  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
  },

  gpsDeviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GpsDevice",
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
  },

  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Trip",
  },

  latitude: Number,
  longitude: Number,
  speed: Number,
  heading: Number,
  altitude: Number,
  accuracy: Number,
  timestamp: Date
};

module.exports = new ajModel("GpsHistory", gpsHistorySchema).getModel();
