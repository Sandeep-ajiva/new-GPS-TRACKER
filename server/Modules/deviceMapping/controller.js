const mongoose = require("mongoose");
const MappingModel = require("./model");
const VehicleModel = require("../vehicle/model");
const GpsDeviceModel = require("../gpsDevice/model");
const paginate = require("../../helpers/limitoffset");
const Validator = require("../../helpers/validators");

/* ---------------- VALIDATION ---------------- */
const validateAssign = async (data) => {
  const rules = {
    vehicleId: "required|string",
    deviceId: "required|string",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

/* ---------------- ASSIGN ---------------- */
exports.assign = async (req, res) => {
  try {
    await validateAssign(req.body);

    const { vehicleId, deviceId } = req.body;

    if (
      !mongoose.isValidObjectId(vehicleId) ||
      !mongoose.isValidObjectId(deviceId)
    ) {
      return res.status(400).json({ status: false, message: "Invalid IDs" });
    }

    const vehicle = await VehicleModel.findById(vehicleId);
    const device = await GpsDeviceModel.findById(deviceId);

    if (!vehicle || !device) {
      return res.status(404).json({ status: false, message: "Vehicle or Device not found" });
    }

    // 🔒 ORG CHECK
    if (
      req.user.role !== "superadmin" &&
      (vehicle.organizationId.toString() !== req.orgId.toString() ||
        device.organizationId.toString() !== req.orgId.toString())
    ) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // 1 DEVICE → 1 VEHICLE (ACTIVE = unassignedAt === null)
    const activeDeviceMap = await MappingModel.findOne({
      gpsDeviceId: deviceId,
      unassignedAt: null,
    });
    if (activeDeviceMap) {
      return res.status(400).json({ status: false, message: "Device already assigned" });
    }

    // 1 VEHICLE → 1 DEVICE
    const activeVehicleMap = await MappingModel.findOne({
      vehicleId,
      unassignedAt: null,
    });
    if (activeVehicleMap) {
      return res.status(400).json({ status: false, message: "Vehicle already has a device" });
    }

    if (device.status !== "stock") {
      return res.status(400).json({ status: false, message: "Device not available" });
    }

    const mapping = await MappingModel.create({
      vehicleId,
      gpsDeviceId: deviceId,
      organizationId: vehicle.organizationId,
      assignedAt: new Date(),
    });

    device.status = "assigned";
    device.assignedVehicle = vehicleId;
    await device.save();

    res.status(201).json({
      status: true,
      message: "Device assigned to vehicle",
      data: mapping,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ---------------- GET ALL ---------------- */
exports.getAll = async (req, res) => {
  try {
    const filter = {};

    if (req.user.role !== "superadmin") {
      filter.organizationId = req.orgId;
    }

    const result = await paginate(
      MappingModel,
      filter,
      req.query.page,
      req.query.limit,
      ["vehicleId", "gpsDeviceId"],
      [],
      req.query.search
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ---------------- GET BY ID ---------------- */
exports.getById = async (req, res) => {
  try {
    const mapping = await MappingModel.findById(req.params.id)
      .populate("vehicleId")
      .populate("gpsDeviceId");

    if (!mapping) return res.status(404).json({ status: false, message: "Not found" });

    if (
      req.user.role !== "superadmin" &&
      mapping.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    res.json({ status: true, data: mapping });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ---------------- GET BY VEHICLE ---------------- */
exports.getByVehicle = async (req, res) => {
  try {
    const vehicle = await VehicleModel.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ status: false, message: "Vehicle not found" });

    if (
      req.user.role !== "superadmin" &&
      vehicle.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    const mappings = await MappingModel.find({ vehicleId: req.params.id })
      .populate("gpsDeviceId")
      .sort({ assignedAt: -1 });

    res.json({ status: true, data: mappings });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ---------------- GET BY DEVICE ---------------- */
exports.getByDevice = async (req, res) => {
  try {
    const device = await GpsDeviceModel.findById(req.params.id);
    if (!device) return res.status(404).json({ status: false, message: "Device not found" });

    if (
      req.user.role !== "superadmin" &&
      device.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    const mappings = await MappingModel.find({ gpsDeviceId: req.params.id })
      .populate("vehicleId")
      .sort({ assignedAt: -1 });

    res.json({ status: true, data: mappings });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ---------------- UNASSIGN ---------------- */
exports.unassign = async (req, res) => {
  try {
    const mapping = await MappingModel.findById(req.params.id);

    if (!mapping || mapping.unassignedAt !== null) {
      return res.status(404).json({ status: false, message: "Active mapping not found" });
    }

    if (
      req.user.role !== "superadmin" &&
      mapping.organizationId.toString() !== req.orgId.toString()
    ) {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    mapping.unassignedAt = new Date();
    await mapping.save();

    await GpsDeviceModel.findByIdAndUpdate(mapping.gpsDeviceId, {
      status: "stock",
      assignedVehicle: null,
    });

    res.json({ status: true, message: "Device unassigned" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

/* ---------------- DELETE (SUPERADMIN) ---------------- */
exports.remove = async (req, res) => {
  try {
    if (req.user.role !== "superadmin") {
      return res.status(403).json({ status: false, message: "Forbidden" });
    }

    await MappingModel.findByIdAndDelete(req.params.id);
    res.json({ status: true, message: "Mapping deleted permanently" });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
