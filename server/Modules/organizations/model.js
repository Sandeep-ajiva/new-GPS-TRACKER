const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const organizationSchema = {
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  address: {
    type: String,
    default: "",
  },

  status: {
    type: String,
    enum: ["pending", "active", "suspended", "expired"],
    default: "active",
  },

  // Parent–Child organisation support
  parentOrganizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    default: null,
  },

  // SuperAdmin / OrgAdmin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
};

const OrganizationModel = new ajModel(
  "Organization",
  organizationSchema
).getModel();

module.exports = OrganizationModel;
