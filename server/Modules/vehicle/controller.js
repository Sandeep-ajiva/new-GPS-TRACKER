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
  // ais140Compliant: "boolean",
  // ais140CertificateNumber: "string",
  status: "in:active,inactive,maintenance,decommissioned",
  runningStatus: "in:running,idle,stopped,inactive",
  // image: "string",
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

    const organizationId =
      req.user.role === "superadmin" ? req.body.organizationId : req.orgId;

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

    const image = req.file ? `/uploads/vehicles/${req.file.filename}` : null;

    const vehicle = await VehicleModel.create({
      organizationId,
      ...req.body,
      vehicleNumber,
      image,
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

/* -------------------------------------------------------------------------- */
/*                                   UPDATE                                   */
/* -------------------------------------------------------------------------- */

exports.update = async (req, res) => {
  try {
    // SAME RULES, NO MODIFICATION
    await new Validator(req.body, VEHICLE_RULES).validate();

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

    if (req.file) {
      req.body.image = `/uploads/vehicles/${req.file.filename}`;
    }

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
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   GET ALL                                  */
/* -------------------------------------------------------------------------- */

exports.getAll = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role !== "superadmin") {
      filter.organizationId = req.orgId;
    }

    const result = await paginate(
      VehicleModel,
      filter,
      req.query.page,
      req.query.limit,
      ["createdBy"],
      ["vehicleNumber", "model", "vehicleType"],
      req.query.search,
    );

    return res.status(200).json(result);
  } catch (error) {
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
    const vehicle = await VehicleModel.findById(req.params.id);

    if (!vehicle) {
      return res.status(404).json({
        status: false,
        message: "Vehicle not found",
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
