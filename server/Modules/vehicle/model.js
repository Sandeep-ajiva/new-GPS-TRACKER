const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleSchema = {
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },

  vehicleType: {
    type: String,
    enum: ["car", "bus", "truck", "bike", "other"],
    required: true,
  },

  vehicleNumber: {
    type: String,
    required: function(){
      return ["car", "bus", "truck", "bike"].includes(this.vehicleType);
    },
    trim: true,
  },
  image:{
    type: String,
    trim: true,
  },

  model: {
    type: String,
    trim: true,
  },

  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  engine: {
    type: Boolean,
    default: false,
  },
};

const VehicleModel = new ajModel("Vehicle", vehicleSchema).getModel();
module.exports = VehicleModel;
