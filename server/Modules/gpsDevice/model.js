const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const gpsDeviceSchema = {

  // 🔗 Organization Mapping
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true
  },
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    default: null
  },


  // 📟 Core Device Identity
  imei: {
    type: String,
    required: true,
    trim: true
  },

  deviceModel: {
    type: String,
    trim: true,
    default: null
  },

  manufacturer: {
    type: String,
    trim: true,
    default: null
  },

  // 📡 SIM & Hardware Info
  simNumber: {
    type: String,
    trim: true,
    default: null
  },

  serialNumber: {
    type: String,
    trim: true,
    default: null
  },

  firmwareVersion: {
    type: String,
    trim: true,
    default: null
  },

  hardwareVersion: {
    type: String,
    trim: true,
    default: null
  },

  // 🔌 Device Status
  connectionStatus: {
    type: String,
    enum: ["online", "offline"],
    default: "offline",
    index: true
  },

  // 🛡 Warranty Information
  warrantyExpiry: {
    type: Date,
    default: null
  },

  status: {
    type: String, enum: ["active", "inactive"],
    default: "active"
  },

  // ⏱️ Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
};

module.exports = new ajModel("GpsDevice", gpsDeviceSchema, null).getModel();
