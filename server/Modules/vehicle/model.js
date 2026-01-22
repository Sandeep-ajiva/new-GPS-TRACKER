const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleSchema = {
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true,
  },

  vehicleType: {
    type: String,
    enum: ["car", "bus", "truck", "bike", "other"],
    required: true,
  },

  vehicleNumber: {
    type: String,
    required: function () {
      return ["car", "bus", "truck", "bike"].includes(this.vehicleType);
    },
    trim: true,
    uppercase: true,
    minlength: 2,
  },

  make: String,
  model: String,

  year: {
    type: Number,
    min: 1900,
    max: new Date().getFullYear() + 1,
  },

  color: String,
  image: String,

  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "GpsDevice",
    default: null,
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    default: null,
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
    index: true,
  },

  runningStatus: {
    
    type: String,
    enum: ["running", "idle", "stopped", "inactive"],
    default: "inactive",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
};

const VehicleModel = new ajModel("Vehicle", vehicleSchema, null).getModel();

// Add compound index after model creation
VehicleModel.collection.createIndex(
  { organizationId: 1, vehicleNumber: 1 },
  { unique: true, background: true }
).catch((err) => {
  console.error("VehicleModel index creation error:", err && err.message ? err.message : err);
});

module.exports = VehicleModel;
