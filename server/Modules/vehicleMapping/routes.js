const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/assign",
  requireAuth,
  checkAuthorization(["admin", "manager"], "vehicleMapping", "create"),
  Controller.assign
);

router.post(
  "/unassign",
  requireAuth,
  checkAuthorization(["admin", "manager"], "vehicleMapping", "update"),
  Controller.unassign
);

router.get(
  "/active",
  requireAuth,
  checkAuthorization(["admin", "manager", "viewer"], "vehicleMapping", "read"),
  Controller.getActiveMappings
);

router.get(
  "/vehicle/:vehicleId",
  requireAuth,
  checkAuthorization(["admin", "manager", "viewer"], "vehicleMapping", "read"),
  Controller.getByVehicle
);

router.get(
  "/device/:gpsDeviceId",
  requireAuth,
  checkAuthorization(["admin", "manager", "viewer"], "vehicleMapping", "read"),
  Controller.getByDevice
);

module.exports = router;
