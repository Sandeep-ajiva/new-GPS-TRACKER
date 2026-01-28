const express = require("express");
const router = express.Router();

const verifyToken = require("../../middleware/verifyToken");
const checkOrganization = require("../../middleware/checkOrganization");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/",
  requireAuth,
  checkAuthorization(["admin", "manager"], "drivers", "create"),
  Controller.create,
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
  requireAuth,
  checkAuthorization(["admin", "manager"], "drivers", "read"),
  Controller.getAll,
);

router.get(
  "/:id",
  requireAuth,
  checkAuthorization(["admin", "manager"], "drivers", "read"),
  Controller.getById,
);

router.put(
  "/:id",
  requireAuth,
  checkAuthorization(["admin", "manager"], "drivers", "update"),
  Controller.update,
);

router.delete(
  "/:id",
  requireAuth,
  checkAuthorization(["admin"], "drivers", "delete"),
  Controller.delete,
);

module.exports = router;
