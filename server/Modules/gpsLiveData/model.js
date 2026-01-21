const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const gpsLiveDataSchema = {
  organizationId:{ type: mongoose.Schema.Types.ObjectId, ref:"Organization" },
  vehicleId:{ type: mongoose.Schema.Types.ObjectId, ref:"Vehicle" },
  gpsDeviceId:{ type: mongoose.Schema.Types.ObjectId, ref:"GpsDevice" },
  latitude:Number,
  longitude:Number,
  currentLocation:String,
  currentSpeed:Number,
  fuelPercentage:Number,
  currentMileage:Number,
  engineStatus:Boolean,
  ignitionStatus:Boolean,
  movementStatus:String,
  batteryLevel:Number,
  signalStrength:Number,
  acStatus:Boolean,
  lastIgnitionOn:Date,
  temperature:String,
  lastIgnitionOff:Date
};

module.exports = new ajModel("GpsLiveData", gpsLiveDataSchema).getModel();
