const mongoose = require("mongoose");
const VehicleModel = require("./model");
const paginate = require("../../helpers/limitoffset");
const Validator = require("../../helpers/validators");

const validateCreateVehicle = async (data, user) => {
  const rules = {
    vehicleType: "required|in:car,bus,truck,bike,other",
    model: "string",
    // make: "string",
    color: "string",
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
  const rules = {};

  if (data.vehicleType !== undefined) rules.vehicleType = "in:car,bus,truck,bike,other";
  if (data.vehicleNumber !== undefined) rules.vehicleNumber = "string";
  if (data.make !== undefined) rules.make = "string";
  if (data.model !== undefined) rules.model = "string";
  if (data.year !== undefined) rules.year = "string"; // ✅ number rule not defined, use string
  if (data.color !== undefined) rules.color = "string";
  if (data.status !== undefined) rules.status = "in:active,inactive";
  if (data.runningStatus !== undefined)
    rules.runningStatus = "in:running,idle,stopped,inactive";
  if (data.deviceId !== undefined) rules.deviceId = "string";
  if (data.driverId !== undefined) rules.driverId = "string";
  if (data.image !== undefined) rules.image = "string";

  // Remove empty strings from validation
  Object.keys(data).forEach((key) => {
    if (data[key] === "") {
      delete rules[key];
    }
  });

  const validator = new Validator(data, rules);
  await validator.validate();

  // ✅ Convert year to number if provided
  if (data.year !== undefined) data.year = Number(data.year);
};



exports.create = async (req, res) => {
  try {
    await validateCreateVehicle(req.body, req.user);

    const {
      vehicleType,
      vehicleNumber,
      make,
      model,
      year,
      color,
      deviceId,
      driverId,
      status,
    } = req.body;

    // Handle image upload - use uploaded file path if available, otherwise use from body
    const image = req.file
      ? `/uploads/vehicles/${req.file.filename}`
      : req.body.image || null;

    const organizationId =
      req.user.role === "superadmin" ? req.body.organizationId : req.orgId;

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
      return res.status(409).json({
        status: false,
        message: "Vehicle with this number already exists in this organization",
      });
    }

    const vehicle = await VehicleModel.create({
      organizationId,
      vehicleType,
      vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase().trim() : null,
      make: make || null,
      model: model || null,
      year: year || null,
      color: color || null,
      image: image || null,
      deviceId: deviceId || null,
      driverId: driverId || null,
      status: status || "active",
      runningStatus: "inactive",
      createdBy: req.user._id,
    });

    return res.status(201).json({
      status: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Create Vehicle Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
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
      search,
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
      errors: error.errors || null,
    });
  }
};

exports.update = async (req, res) => {
  try {
    await validateUpdateVehicle(req.body);

    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found",
      });
    }

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({
        status: false,
        message: "Forbidden",
      });
    }

    // Check for duplicate vehicle number if updating it
    if (req.body.vehicleNumber) {
      const duplicate = await VehicleModel.findOne({
        organizationId: vehicle.organizationId,
        vehicleNumber: req.body.vehicleNumber.toUpperCase().trim(),
        _id: { $ne: vehicle._id },
      });

      if (duplicate) {
        return res.status(409).json({
          status: false,
          message: "Vehicle number already exists in this organization",
        });
      }

      req.body.vehicleNumber = req.body.vehicleNumber.toUpperCase().trim();
    }

    // Handle image upload - use uploaded file path if available, otherwise keep existing or use from body
    if (req.file) {
      req.body.image = `/uploads/vehicles/${req.file.filename}`;
    }

    // Update with new fields
    Object.assign(vehicle, req.body);
    vehicle.updatedAt = new Date();
    await vehicle.save();

    return res.json({
      status: true,
      message: "Vehicle updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Update Vehicle Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
      errors: error.errors || null,
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
      errors: error.errors || null,
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
    const { status, runningStatus } = req.body;

    if (status && !["active", "inactive"].includes(status)) {
      return res.status(400).json({
        status: false,
        message: "Invalid status. Must be 'active' or 'inactive'",
      });
    }

    if (
      runningStatus &&
      !["running", "idle", "stopped", "inactive"].includes(runningStatus)
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid running status. Must be 'running', 'idle', 'stopped', or 'inactive'",
      });
    }

    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found",
      });
    }

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({
        status: false,
        message: "Forbidden",
      });
    }

    if (status) vehicle.status = status;
    if (runningStatus) vehicle.runningStatus = runningStatus;
    vehicle.updatedAt = new Date();
    await vehicle.save();

    return res.json({
      status: true,
      message: "Vehicle status updated successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
      errors: error.errors || null,
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

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
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
      errors: error.errors || null,
    });
  }
};
