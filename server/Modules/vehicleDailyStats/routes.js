const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.get(
  "/",
  requireAuth,
  checkAuthorization(["admin"], "vehicleDailyStats", "read"),
  Controller.getAll
);

router.get(
  "/vehicle/:vehicleId",
  requireAuth,
  checkAuthorization(["admin"], "vehicleDailyStats", "read"),
  Controller.getByVehicle
);

router.get(
  "/vehicle/:vehicleId/date/:date",
  requireAuth,
  checkAuthorization(["admin"], "vehicleDailyStats", "read"),
  Controller.getByVehicleAndDate
);

module.exports = router;
