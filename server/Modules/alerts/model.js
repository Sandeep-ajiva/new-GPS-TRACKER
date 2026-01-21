const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const alertSchema = {
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  gpsDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: "GpsDevice" },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  type: String,
  message: String,
  locationType: String,
  locationCoordinates: Array,
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: Date
};

module.exports = new ajModel("Alert", alertSchema).getModel();
