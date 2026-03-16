const { ajModel } = require("../../common/classes/Model");
const mongoose = require("mongoose");

const poiSchema = {
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization" },
  name: String,
  description: String,
  type: String,
  locationType: String,
  locationCoordinates: Array,
  radius: Number,
  tags: Array
};

const instance = new ajModel("POI", poiSchema);
instance.index({ organizationId: 1, locationCoordinates: "2dsphere" });

module.exports = instance.getModel();
