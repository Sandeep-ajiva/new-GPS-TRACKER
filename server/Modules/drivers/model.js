const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const driverSchema = {
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  assignedVehicleId: { type: mongoose.Schema.Types.ObjectId, ref: "Vehicle" },
  firstName:String,
  lastName:String,
  phone:String,
  email:String,
  licenseNumber:String,
  licenseExpiry:Date,
  photo:String,
  address:String,
  status:String,
  availability:Boolean,
  totalTrips:Number,
  rating:Number,
  joiningDate:Date
};

module.exports = new ajModel("Driver", driverSchema).getModel();
