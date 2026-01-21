const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleMappingSchema = {
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle", required:true },
  gpsDeviceId: { type: mongoose.Schema.Types.ObjectId, ref: "GpsDevice", required:true },
  assignedAt:{ type:Date, default:Date.now },
  unassignedAt:Date
};

module.exports = new ajModel("VehicleMapping", vehicleMappingSchema).getModel();
