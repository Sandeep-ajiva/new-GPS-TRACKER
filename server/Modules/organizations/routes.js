const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

const Controller = require('./controller')

router.post(
  "/",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "create"),
  Controller.createOrganization
);

router.get("/", requireAuth, checkAuthorization(["superadmin"], "organizations", "read"), Controller.getAll);
router.get("/:id", requireAuth, checkAuthorization(["superadmin"], "organizations", "read"), Controller.getById);
router.put("/:id", requireAuth, checkAuthorization(["superadmin"], "organizations", "update"), Controller.update);
router.delete("/:id", requireAuth, checkAuthorization(["superadmin"], "organizations", "delete"), Controller.delete);


module.exports = router;
