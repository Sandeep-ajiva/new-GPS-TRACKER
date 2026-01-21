const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const gpsDeviceSchema = {
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  imei: { type: String, required: true, unique: true },
  deviceModel:String,
  manufacturer:String,
  simNumber:String,
  serialNumber:String,
  firmwareVersion:String,
  hardwareVersion:String,
  connectionStatus:{ type:String, enum:["online","offline"], default:"offline" },
  warrantyExpiry:Date
};

module.exports = new ajModel("GpsDevice", gpsDeviceSchema).getModel();
