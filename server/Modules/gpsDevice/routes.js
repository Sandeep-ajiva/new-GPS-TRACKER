const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/",
  requireAuth,
  checkAuthorization(["admin", "manager"], "gpsDevices", "create"),
  Controller.create
);

router.get(
  "/",
  requireAuth,
  checkAuthorization(["admin", "manager"], "gpsDevices", "read"),
  Controller.getAll
);

router.get(
  "/available",
  requireAuth,
  checkAuthorization(["admin", "manager"], "gpsDevices", "read"),
  Controller.getAvailable
);

router.get(
  "/:id",
  requireAuth,
  checkAuthorization(["admin", "manager"], "gpsDevices", "read"),
  Controller.getById
);

router.put(
  "/:id",
  requireAuth,
  checkAuthorization(["admin", "manager"], "gpsDevices", "update"),
  Controller.update
);

router.put(
  "/:id/status",
  requireAuth,
  checkAuthorization(["admin", "manager"], "gpsDevices", "update"),
  Controller.updateConnectionStatus
);

router.delete(
  "/:id",
  requireAuth,
  checkAuthorization(["admin"], "gpsDevices", "delete"),
  Controller.delete
);

module.exports = router;
