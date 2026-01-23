const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const vehicleDriverMappingSchema = {
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
    index: true
  },

  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Vehicle",
    required: true,
    index: true
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Driver",
    required: true,
    index: true
  },

  assignedAt: {
    type: Date,
    default: Date.now
  },

  unassignedAt: {
    type: Date,
    default: null
  },

  status: {
    type: String,
    enum: ["assigned", "unassigned"],
    default: "assigned",
    index: true
  }
};

const VehicleDriverMapping = new ajModel(
  "VehicleDriverMapping",
  vehicleDriverMappingSchema
).getModel();

/**
 * ✅ Partial unique index
 * ✔ One active driver per vehicle
 * ✔ Active = unassignedAt === null
 */
VehicleDriverMapping.collection.createIndex(
  { vehicleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      unassignedAt: null
    }
  }
);

/**
 * ✅ (Optional but recommended)
 * ✔ One active vehicle per driver
 */
VehicleDriverMapping.collection.createIndex(
  { driverId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      unassignedAt: null
    }
  }
);

module.exports = VehicleDriverMapping;
