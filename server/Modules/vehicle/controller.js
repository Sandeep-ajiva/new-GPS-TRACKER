const mongoose = require("mongoose");
const VehicleModel = require("./model");
const paginate = require("../../helpers/limitoffset");
const Validator = require("../../helpers/validators");

/* -------------------------------------------------------------------------- */
/*                               VALIDATION RULES                              */
/* -------------------------------------------------------------------------- */

const VEHICLE_RULES = {
  vehicleType: "in:car,bus,truck,bike,other",
  vehicleNumber: "string",
  make: "string",
  model: "string",
  year: "numeric",
  color: "string",
  deviceId: "string",
  driverId: "string",
  status: "in:active,inactive,maintenance,decommissioned",
  runningStatus: "in:running,idle,stopped,inactive",
};

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */

exports.create = async (req, res) => {
  try {
    const rules = {
      ...VEHICLE_RULES,
      vehicleType: "required|in:car,bus,truck,bike,other",
      vehicleNumber: "required|string",
    };

    if (req.user.role === "superadmin") {
      rules.organizationId = "required|string";
    }

    await new Validator(req.body, rules).validate();

    // 🔐 ORG SCOPE FIX
    let organizationId;
    if (req.user.role === "superadmin") {
      organizationId = req.body.organizationId || req.orgId;
    } else if (
      req.body.organizationId &&
      req.orgScope !== "ALL" &&
      req.orgScope.some(id => id.toString() === req.body.organizationId.toString())
    ) {
      organizationId = req.body.organizationId;
    } else {
      organizationId = req.orgId;
    }

    if (!organizationId) {
      return res.status(400).json({
        status: false,
        message: "OrganizationId is required",
      });
    }

    const vehicleNumber = req.body.vehicleNumber.toUpperCase().trim();

    const exists = await VehicleModel.findOne({
      organizationId,
      vehicleNumber,
    });

    if (exists) {
      return res.status(409).json({
        status: false,
        message: "Vehicle already exists in this organization",
      });
    }

    const vehicleData = {
      organizationId,
      ...req.body,
      vehicleNumber,
      runningStatus: "inactive",
      createdBy: req.user._id,
    };

    // Clean up empty strings for IDs
    if (!vehicleData.deviceId) vehicleData.deviceId = null;
    if (!vehicleData.driverId) vehicleData.driverId = null;

    const vehicle = await VehicleModel.create(vehicleData);

    return res.status(201).json({
      status: true,
      message: "Vehicle created successfully",
      data: vehicle,
    });
  } catch (error) {
    console.error("Create Vehicle Error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
      errors: error.errors || null,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   UPDATE                                   */
/* -------------------------------------------------------------------------- */

exports.update = async (req, res) => {
  try {
    // SAME RULES, NO MODIFICATION
    await new Validator(req.body, VEHICLE_RULES).validate();

    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { organizationId: { $in: req.orgScope } };
    const vehicle = await VehicleModel.findOne({ _id: req.params.id, ...orgFilter });

    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or access denied",
      });
    }

    if (req.body.vehicleNumber) {
      const formattedVehicleNumber = req.body.vehicleNumber
        .toUpperCase()
        .trim();

      const duplicate = await VehicleModel.findOne({
        organizationId: vehicle.organizationId,
        vehicleNumber: formattedVehicleNumber,
        _id: { $ne: vehicle._id },
      });

      if (duplicate) {
        return res.status(409).json({
          status: false,
          message: "Vehicle number already exists",
        });
      }

      req.body.vehicleNumber = formattedVehicleNumber;
    }

    // Clean up empty strings for IDs
    if (req.body.deviceId === "") req.body.deviceId = null;
    if (req.body.driverId === "") req.body.driverId = null;

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

    if (error.name === "ValidationError") {
      return res.status(400).json({
        status: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
      errors: error.errors || null,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   GET ALL                                  */
/* -------------------------------------------------------------------------- */

exports.getAll = async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    const filter = {};

    // 🔐 orgScope filter
    if (req.user.role !== "superadmin" && req.orgScope !== "ALL") {
      filter.organizationId = { $in: req.orgScope };
    }

    const result = await paginate(
      VehicleModel,
      filter,
      page,
      limit,

      // ✅ populate
      [
        { path: "organizationId", select: "name" },
        { path: "driverId", select: "firstName lastName" },
      ],

      // ✅ searchable fields
      ["vehicleNumber", "model", "vehicleType"],

      search,

      // ✅ latest first
      { createdAt: -1 }
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get All VehicleModels Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   GET BY ID                                */
/* -------------------------------------------------------------------------- */

exports.getById = async (req, res) => {
  try {
    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { organizationId: { $in: req.orgScope } };
    const vehicle = await VehicleModel.findOne({ _id: req.params.id, ...orgFilter }).populate([
      'organizationId',
      'driverId'
    ]);

    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or access denied",
      });
    }

    return res.json({
      status: true,
      data: vehicle,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

exports.remove = async (req, res) => {
  try {
    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { organizationId: { $in: req.orgScope } };
    const vehicle = await VehicleModel.findOne({ _id: req.params.id, ...orgFilter });

    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found or access denied",
      });
    }

    await VehicleModel.findByIdAndDelete(req.params.id);

    return res.json({
      status: true,
      message: "Vehicle deleted successfully",
    });
  } catch (error) {
    console.error("Delete Vehicle Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};
