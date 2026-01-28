const express = require("express");
const router = express.Router();
const Controller = require("./controller");

const verifyToken = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");
const checkOrganization = require("../../middleware/checkOrganization");

router.get(
  "/",
  requireAuth,
  checkAuthorization(["superadmin", "admin"], "users", "read"),
  Controller.getAll,
);

router.get("/me", requireAuth, Controller.getMe);

router.get(
  "/users",
  verifyToken,
  checkAuthorization(["admin", "superadmin"], "users", "read"),
  checkOrganization,
  Controller.getManagerByOrganization,
);

router.post("/login", Controller.login);

router.post("/organization-admin", verifyToken,
    checkAuthorization(["superadmin"], "users", "create"), 
    handleLogoUpload,
    Controller.createOrganizationWithAdmin);


router.put("/:id", verifyToken, checkAuthorization(["superadmin"], "users", "update"), Controller.updateUser);
router.delete("/:id", verifyToken, checkAuthorization(["superadmin"], "users", "delete"), Controller.deleteUser);

module.exports = router;
