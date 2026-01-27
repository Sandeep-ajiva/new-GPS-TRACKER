const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require("./controller");

router.post(
  "/",
  requireAuth,
  checkAuthorization(["admin", "manager"], "drivers", "create"),
  Controller.create,
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
