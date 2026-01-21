const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.get(
  "/",
  requireAuth,
  checkAuthorization(["admin", "manager", "viewer"], "alerts", "read"),
  Controller.getAll
);

router.get(
  "/vehicle/:vehicleId",
  requireAuth,
  checkAuthorization(["admin", "manager"], "alerts", "read"),
  Controller.getByVehicle
);

router.get(
  "/unacknowledged",
  requireAuth,
  checkAuthorization(["admin", "manager"], "alerts", "read"),
  Controller.getUnacknowledged
);

router.post(
  "/:id/ack",
  requireAuth,
  checkAuthorization(["admin", "manager"], "alerts", "update"),
  Controller.acknowledge
);

module.exports = router;
