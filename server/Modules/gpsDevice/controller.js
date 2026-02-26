const GpsDevice = require("./model");
const Validator = require("../../helpers/validators");
const mongoose = require("mongoose");
const paginate = require("../../helpers/limitoffset");

const normalizeGpsDevicePayload = (data = {}) => {
  const payload = { ...data };

  if (typeof payload.imei === "string") {
    payload.imei = payload.imei.trim();
  }

  if (typeof payload.firmwareVersion === "string") {
    payload.firmwareVersion = payload.firmwareVersion.trim();
  }

  if (typeof payload.softwareVersion === "string") {
    payload.softwareVersion = payload.softwareVersion.trim();
  }

  if (!payload.softwareVersion && payload.firmwareVersion) {
    payload.softwareVersion = payload.firmwareVersion;
  }

  if (!payload.firmwareVersion && payload.softwareVersion) {
    payload.firmwareVersion = payload.softwareVersion;
  }

  return payload;
};

/* -------------------------------------------------------------------------- */
/*                               VALIDATIONS                                  */
/* -------------------------------------------------------------------------- */

const validateCreateGpsDevice = async (data, user) => {
  const rules = {
    imei: "required|string|size:15",
    softwareVersion: "required|string",
    status: "in:active,inactive,suspended",
  };

  if (user.role === "superadmin") {
    rules.organizationId = "required|string";
  }

  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateUpdateGpsDevice = async (data, user) => {
  const rules = {
    imei: "string|size:15",
    softwareVersion: "string",
    vehicleRegistrationNumber: "string",
    status: "in:active,inactive,suspended",
    organizationId: "string",
    vehicleId: "string",
    configuration: "object",
    simNumber: "string",
    deviceModel: "string",
    manufacturer: "string",
    serialNumber: "string",
    firmwareVersion: "string",
    hardwareVersion: "string",
    warrantyExpiry: "string",
  };

  const allowedFields = Object.keys(rules);

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

/* -------------------------------------------------------------------------- */
/*                                   CREATE                                   */
/* -------------------------------------------------------------------------- */

exports.create = async (req, res) => {
  try {
    const payload = normalizeGpsDevicePayload(req.body);
    delete payload.isOnline;
    delete payload.connectionStatus;
    await validateCreateGpsDevice(payload, req.user);

    let organizationId = null;
    if (req.user.role === "superadmin") {
      organizationId = payload.organizationId;
    } else if (payload.organizationId) {
      const candidate = payload.organizationId.toString();
      if (
        req.orgScope === "ALL" ||
        (Array.isArray(req.orgScope) &&
          req.orgScope.some((id) => id.toString() === candidate))
      ) {
        organizationId = candidate;
      }
    }

    if (!organizationId) {
      organizationId = req.orgId;
    }

    if (!organizationId) {
      return res.status(400).json({
        status: false,
        message: "OrganizationId is required",
      });
    }

    const existing = await GpsDevice.findOne({
      imei: payload.imei,
    });

    if (existing) {
      return res.status(409).json({
        status: false,
        message: "GPS Device with this IMEI already exists",
      });
    }

    const device = await GpsDevice.create({
      ...payload,
      isOnline: false,
      connectionStatus: "offline",
      organizationId,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      status: true,
      message: "GPS Device created successfully",
      data: device,
    });
  } catch (error) {
    console.error("Create GPS Device Error:", error);
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
    const { status, isOnline, page, limit, search } = req.query;

    const filter = {};

    // 🔐 orgScope filter
    if (req.user.role !== "superadmin" && req.orgScope !== "ALL") {
      filter.organizationId = { $in: req.orgScope };
    }

    // 🎯 extra filters
    if (status) filter.status = status;
    if (isOnline !== undefined) filter.isOnline = isOnline === "true";

    const result = await paginate(
      GpsDevice,
      filter,
      page,
      limit,

      // ✅ populate (correct format)
      [
        { path: "vehicleId", select: "vehicleNumber" },
        { path: "organizationId", select: "name" }
      ],

      // ✅ searchable fields
      ["imei", "vehicleRegistrationNumber", "softwareVersion"],

      search,

      // ✅ latest first
      { createdAt: -1 }
    );

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get All GPS Devices Error:", error);

    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                GET BY ID                                   */
/* -------------------------------------------------------------------------- */

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid ID",
      });
    }

    const device = await GpsDevice.findById(id)
      .populate("organizationId")
      .populate("vehicleId");

    if (!device) {
      return res.status(404).json({
        status: false,
        message: "GPS Device not found",
      });
    }

    if (
      req.user.role !== "superadmin" &&
      device.organizationId._id.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({
        status: false,
        message: "Forbidden",
      });
    }

    return res.json({
      status: true,
      data: device,
    });
  } catch (error) {
    console.error("Get GPS Device By ID Error:", error);
    return res.status(500).json({
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
    const payload = normalizeGpsDevicePayload(req.body);
    delete payload.isOnline;
    delete payload.connectionStatus;
    await validateUpdateGpsDevice(payload, req.user);

    const device = await GpsDevice.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        status: false,
        message: "GPS Device not found",
      });
    }

    if (
      req.user.role !== "superadmin" &&
      device.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({
        status: false,
        message: "Forbidden",
      });
    }

    if (payload.imei) {
      const duplicate = await GpsDevice.findOne({
        imei: payload.imei,
        _id: { $ne: device._id },
      });

      if (duplicate) {
        return res.status(409).json({
          status: false,
          message: "Duplicate IMEI not allowed",
        });
      }

      payload.imei = payload.imei.trim();
    }

    Object.assign(device, payload);
    await device.save();

    await device.populate("organizationId vehicleId");

    return res.json({
      status: true,
      message: "GPS Device updated successfully",
      data: device,
    });
  } catch (error) {
    console.error("Update GPS Device Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                             UPDATE ONLINE STATUS                            */
/* -------------------------------------------------------------------------- */

exports.updateConnectionStatus = async (req, res) => {
  return res.status(403).json({
    status: false,
    message: "Connection status is managed by TCP server only",
  });
};

/* -------------------------------------------------------------------------- */
/*                                  AVAILABLE                                 */
/* -------------------------------------------------------------------------- */

exports.getAvailable = async (req, res) => {
  try {
    const filter = { isOnline: true };

    if (req.user.role !== "superadmin") {
      filter.organizationId = req.orgId;
    }

    const devices = await GpsDevice.find(filter)
      .populate("organizationId")
      .populate("vehicleId");

    return res.json({
      status: true,
      data: devices,
    });
  } catch (error) {
    console.error("Get Available Devices Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* -------------------------------------------------------------------------- */
/*                                   DELETE                                   */
/* -------------------------------------------------------------------------- */

exports.delete = async (req, res) => {
  try {
    const device = await GpsDevice.findById(req.params.id);

    if (!device) {
      return res.status(404).json({
        status: false,
        message: "GPS Device not found",
      });
    }

    if (
      req.user.role !== "superadmin" &&
      device.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({
        status: false,
        message: "Forbidden",
      });
    }

    await device.deleteOne();

    return res.json({
      status: true,
      message: "GPS Device deleted successfully",
    });
  } catch (error) {
    console.error("Delete GPS Device Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};
