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

module.exports = new ajModel("POI", poiSchema).getModel();
