const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/verifyToken");
const checkOrganization = require("../../middleware/checkOrganization");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "gpsDevice", "create"),
  checkOrganization,
  Controller.create
);

router.get(
  "/",
  verifyToken,
  checkAuthorization(["admin", "manager", "driver"], "gpsDevice", "read"),
  checkOrganization,
  Controller.getAll
);

router.get(
  "/available",
  verifyToken,
  checkAuthorization(["admin", "manager", "driver"], "gpsDevice", "read"),
  checkOrganization,
  Controller.getAvailable
);

router.get(
  "/:id",
  verifyToken,
  checkAuthorization(["admin", "manager", "driver"], "gpsDevice", "read"),
  checkOrganization,
  Controller.getById
);

router.put(
  "/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "gpsDevice", "update"),
  checkOrganization,
  Controller.update
);

router.put(
  "/:id/status",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "gpsDevice", "update"),
  checkOrganization,
  Controller.updateConnectionStatus
);

router.delete(
  "/:id",
  verifyToken,
  checkAuthorization(["superadmin"], "gpsDevice", "delete"),
  checkOrganization,
  Controller.delete
);

module.exports = router;
