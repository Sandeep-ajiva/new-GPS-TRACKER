const mongoose = require("mongoose");
const VehicleModel = require("./model");
const paginate = require("../../helpers/limitoffset");
const Validator = require('../../helpers/validators')


const validateCreateVehicle = async (data, user) => {
  const rules = {
    vehicleType: "required|in:car,bus,truck,bike,other",
    model: "string",
    status: "in:active,inactive",
  };

  if (["car", "bus", "truck", "bike"].includes(data.vehicleType)) {
    rules.vehicleNumber = "required|string";
  }

  if (user.role === "superadmin") {
    rules.organizationId = "required|string";
  }

  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateUpdateVehicle = async (data) => {
  const rules = {
    vehicleType: "in:car,bus,truck,bike,other",
    vehicleNumber: "string",
    model: "string",
    status: "in:active,inactive",
  };

  // ❌ Empty string check
  Object.keys(data).forEach((key) => {
    if (data[key] === "") {
      throw {
        status: 400,
        message: `${key} cannot be empty`,
      };
    }
  });

  // ✅ Allowed fields only
  const allowedFields = [
    "vehicleType",
    "vehicleNumber",
    "model",
    "status",
  ];

  Object.keys(data).forEach((key) => {
    if (!allowedFields.includes(key)) {
      throw {
        status: 400,
        message: `Invalid field: ${key}`,
      };
    }
  });

  const validator = new Validator(data, rules);
  await validator.validate();
};



exports.create = async (req, res) => {
  try {
    await validateCreateVehicle(req.body, req.user);


    const { vehicleType, vehicleNumber, model, status } = req.body;

    const organizationId =
      req.user.role === "superadmin"
        ? req.body.organizationId
        : req.orgId;

    if (!organizationId) {
      return res.status(400).json({
        status: false,
        message: "OrganizationId is required",
      });
    }

    if (
      ["car", "bus", "truck", "bike"].includes(vehicleType) &&
      !vehicleNumber
    ) {
      return res.status(400).json({
        status: false,
        message: "Vehicle number is required",
      });
    }

    const exists = await VehicleModel.findOne({
      organizationId,
      vehicleNumber,
    });

    if (exists) {
      return res.status(400).json({
        status: false,
        message: "Vehicle already exists",
      });
    }

    const vehicle = await VehicleModel.create({
      organizationId,
      vehicleType,
      vehicleNumber,
      model,
      status: status || "active",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      status: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * =========================
 * GET ALL VEHICLES
 * =========================
 */
exports.getAll = async (req, res) => {
  try {
    const { vehicleType, status, page, limit, search } = req.query;

    const filter = {};

    if (req.user.role !== "superadmin") {
      filter.organizationId = req.orgId;
    }

    if (vehicleType) filter.vehicleType = vehicleType;
    if (status) filter.status = status;

    const result = await paginate(
      VehicleModel,
      filter,
      page,
      limit,
      ["createdBy"],
      ["vehicleNumber", "model", "vehicleType"],
      search
    );

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/**
 * =========================
 * GET VEHICLE BY ID
 * =========================
 */
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const vehicle = await VehicleModel.findById(id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json({
      status: true,
      data: vehicle,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      message: error.message,
      errors: error.errors || null
    });
  }
};


exports.update = async (req, res) => {
  try {
    await validateUpdateVehicle(req.body);

    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    Object.assign(vehicle, req.body);
    await vehicle.save();

    return res.json({
      status: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      message: error.message,
      errors: error.errors || null
    });
  }
};


exports.deactivate = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    vehicle.status = "inactive";
    await vehicle.save();

    return res.json({
      status: true,
      message: "Vehicle deactivated",
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      message: error.message,
      errors: error.errors || null
    });
  }
};

/**
 * =========================
 * UPDATE VEHICLE STATUS
 * =========================
 */
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    vehicle.status = status;
    await vehicle.save();

    return res.json({
      status: true,
      message: `Vehicle ${status}`,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      message: error.message,
      errors: error.errors || null
    });
  }
};

/**
 * =========================
 * HARD DELETE (SUPERADMIN)
 * =========================
 */
exports.remove = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({ message: "Vehicle not found" });
    }

    if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    await vehicle.deleteOne();

    return res.json({
      status: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      status: false,
      message: error.message,
      errors: error.errors || null
    });
  }
};
