const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.get(
  "/",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "read"),
  Controller.getAll
);

router.get(
  "/vehicle/:vehicleId",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "read"),
  Controller.getByVehicle
);

router.get(
  "/unacknowledged",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "read"),
  Controller.getUnacknowledged
);

router.post(
  "/:id/ack",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "update"),
  Controller.acknowledge
);

router.post(
  "/ack-all",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "update"),
  Controller.acknowledgeAll
);

router.delete(
  "/:id",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "delete"),
  Controller.delete
);

router.delete(
  "/",
  requireAuth,
  checkAuthorization(["superadmin", "admin", "driver"], "alerts", "delete"),
  Controller.deleteAll
);

module.exports = router;
