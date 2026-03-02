const GpsHistory = require("./model");
const paginate = require("../../helpers/limitoffset");
const mongoose = require("mongoose");

/* ==========================================================================
   GET ALL GPS HISTORY (REPLAY / FILTER)
   ========================================================================== */
exports.getAll = async (req, res) => {
  try {
    const { page, limit, search, vehicleId, imei, from, to } = req.query;

    const filter = {};

    // 🔐 ORG SCOPE FIX
    if (req.user.role !== "superadmin" && req.orgScope !== "ALL") {
      filter.organizationId = { $in: req.orgScope };
    }

    if (vehicleId && mongoose.isValidObjectId(vehicleId)) {
      filter.vehicleId = vehicleId;
    }

    if (imei) {
      filter.imei = imei;
    }

    // Date range filter
    if (from || to) {
      filter.gpsTimestamp = {};
      if (from) filter.gpsTimestamp.$gte = new Date(from);
      if (to) filter.gpsTimestamp.$lte = new Date(to);
    }

    const result = await paginate(
      GpsHistory,
      filter,
      page,
      limit,
      ["organizationId", "vehicleId", "gpsDeviceId", "driverId", "tripId"],
      ["imei", "vehicleRegistrationNumber"],
      search,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get GPS History Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/* ==========================================================================
   GET GPS HISTORY BY VEHICLE
   ========================================================================== */
exports.getByVehicle = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { vehicleId } = req.params;

    if (!mongoose.isValidObjectId(vehicleId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid vehicleId",
      });
    }

    const filter = { vehicleId };

    // 🔐 ORG SCOPE FIX
    if (req.orgScope !== "ALL") {
      filter.organizationId = { $in: req.orgScope };
    }


    const result = await paginate(
      GpsHistory,
      filter,
      page,
      limit,
      ["organizationId", "vehicleId", "gpsDeviceId"],
      [],
      search,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get History By Vehicle Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/* ==========================================================================
   GET GPS HISTORY BY DEVICE
   ========================================================================== */
exports.getByDevice = async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const { gpsDeviceId } = req.params;

    if (!mongoose.isValidObjectId(gpsDeviceId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid gpsDeviceId",
      });
    }

    const filter = { gpsDeviceId };

    // 🔐 ORG SCOPE FIX
    if (req.orgScope !== "ALL") {
      filter.organizationId = { $in: req.orgScope };
    }


    const result = await paginate(
      GpsHistory,
      filter,
      page,
      limit,
      ["organizationId", "vehicleId", "gpsDeviceId"],
      [],
      search,
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get History By Device Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/* ==========================================================================
   CLEAR ALL GPS HISTORY (SUPERADMIN ONLY)
   ========================================================================== */
exports.deleteHistory = async (req, res) => {
  try {
    // 🔐 ORG SCOPE FIX
    const filter =
      req.orgScope === "ALL"
        ? {}
        : { organizationId: { $in: req.orgScope } };

    await GpsHistory.deleteMany(filter);
    return res.status(200).json({
      status: true,
      message: "GPS history cleared successfully",
    });
  } catch (error) {
    console.error("Delete GPS History Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
