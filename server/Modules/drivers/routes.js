const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkOrganization = require("../../middleware/checkOrganization");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/",
  requireAuth,
  checkAuthorization(["admin"], "drivers", "create"),
  Controller.create,
);

// Create Driver + User in single request (Industry Standard)
router.post(
  "/create-with-user",
  requireAuth,
  checkAuthorization(["admin", "superadmin"], "drivers", "create"),
  checkOrganization,
  Controller.createDriverUser
);


router.get(
  "/",
  requireAuth,
  checkAuthorization(["admin"], "drivers", "read"),
  Controller.getAll,
);

router.get(
  "/:id",
  requireAuth,
  checkAuthorization(["admin"], "drivers", "read"),
  Controller.getById,
);

router.put(
  "/:id",
  requireAuth,
  checkAuthorization(["admin"], "drivers", "update"),
  Controller.update,
);

router.delete(
  "/:id",
  requireAuth,
  checkAuthorization(["admin"], "drivers", "delete"),
  Controller.delete,
);

module.exports = router;
