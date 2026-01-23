const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/verifyToken");
const checkOrganization = require("../../middleware/checkOrganization");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/assign",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "vehicleMapping", "create"),
  checkOrganization,
  Controller.assign
);

router.post(
  "/unassign",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "vehicleMapping", "update"),
  checkOrganization,
  Controller.unassign
);

router.get(
  "/active",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager", "driver"], "vehicleMapping", "read"),
  checkOrganization,
  Controller.getActiveMappings
);

router.get(
  "/vehicle/:vehicleId",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager", "driver"], "vehicleMapping", "read"),
  checkOrganization,
  Controller.getByVehicle
);

router.get(
  "/device/:gpsDeviceId",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager", "driver"], "vehicleMapping", "read"),
  checkOrganization,
  Controller.getByDevice
);

module.exports = router;
