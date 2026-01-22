const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/verifyToken");
const checkOrganization = require("../../middleware/checkOrganization");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "drivers", "create"),
  checkOrganization,
  Controller.create
);

// Create Driver + User in single request (Industry Standard)
router.post(
  "/create-with-user",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "drivers", "create"),
  checkOrganization,
  Controller.createDriverUser
);


router.get(
  "/",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "drivers", "read"),
  checkOrganization,
  Controller.getAll
);

router.get(
  "/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "drivers", "read"),
  checkOrganization,
  Controller.getById
);

router.put(
  "/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin", "manager"], "drivers", "update"),
  checkOrganization,
  Controller.update
);

router.delete(
  "/:id",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "drivers", "delete"),
  checkOrganization,
  Controller.delete
);

module.exports = router;
