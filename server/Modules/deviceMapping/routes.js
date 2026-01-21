const express = require("express");
const router = express.Router();

const Controller = require("./controller");

const verifyToken = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");
const checkOrganization = require("../../middleware/checkOrganization");

// ASSIGN GPS DEVICE TO VEHICLE
router.post(
  "/",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "deviceMapping", "create"),
  checkOrganization,
  Controller.assign
);

// GET ALL MAPPINGS (HISTORY)
router.get(
  "/",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "deviceMapping", "read"),
  checkOrganization,
  Controller.getAll
);

// GET MAPPING BY ID
router.get(
  "/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "deviceMapping", "read"),
  checkOrganization,
  Controller.getById
);

// GET DEVICE HISTORY OF VEHICLE
router.get(
  "/vehicle/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "deviceMapping", "read"),
  checkOrganization,
  Controller.getByVehicle
);

// GET VEHICLE HISTORY OF DEVICE
router.get(
  "/device/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "deviceMapping", "read"),
  checkOrganization,
  Controller.getByDevice
);

// UNASSIGN DEVICE
router.patch(
  "/:id/unassign",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "deviceMapping", "update"),
  checkOrganization,
  Controller.unassign
);

// HARD DELETE (SUPERADMIN)
router.delete(
  "/:id",
  verifyToken,
  checkAuthorization(["superadmin"], "deviceMapping", "delete"),
  checkOrganization,
  Controller.remove
);

module.exports = router;
