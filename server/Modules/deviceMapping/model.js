const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleDeviceMappingSchema = {
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },

  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
  },

  gpsDeviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GpsDevice",
    required: true,
  },

  assignedAt: {
    type: Date,
    default: Date.now,
  },

  unassignedAt: {
    type: Date,
    default: null,
  },
};

const VehicleDeviceMappingModel = new ajModel(
  "VehicleDeviceMapping",
  vehicleDeviceMappingSchema
).getModel();

module.exports = VehicleDeviceMappingModel;
