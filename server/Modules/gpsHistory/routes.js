const express = require("express");
const router = express.Router();

const Controller = require("./controller");
const verifyToken = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");
const checkOrganization = require("../../middleware/checkOrganization");

// GET ALL / REPLAY
router.get(
  "/",
  verifyToken,
  checkAuthorization(
    ["admin", "superadmin", "manager", "driver"],
    "gpsHistory",
    "read",
  ),
  checkOrganization,
  Controller.getAll,
);

// GET BY VEHICLE
router.get(
  "/vehicle/:vehicleId",
  verifyToken,
  checkAuthorization(
    ["admin", "superadmin", "manager", "driver"],
    "gpsHistory",
    "read",
  ),
  checkOrganization,
  Controller.getByVehicle,
);

// GET BY DEVICE
router.get(
  "/device/:gpsDeviceId",
  verifyToken,
  checkAuthorization(
    ["admin", "superadmin", "manager", "driver"],
    "gpsHistory",
    "read",
  ),
  checkOrganization,
  Controller.getByDevice,
);

// CLEAR HISTORY (SUPERADMIN ONLY)
router.delete(
  "/",
  verifyToken,
  checkAuthorization(["superadmin"], "gpsHistory", "delete"),
  checkOrganization,
  Controller.deleteHistory,
);

module.exports = router;
