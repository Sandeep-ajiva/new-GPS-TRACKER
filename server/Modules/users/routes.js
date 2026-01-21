const express = require("express");
const router = express.Router();
const Controller = require('./controller')

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");



router.get(
    "/admins",
    requireAuth,
    checkAuthorization(["superadmin"], "users", "read"),
    Controller.getAllAdmins
);


router.post("/login", Controller.login);

router.post("/orgadmin", requireAuth,
    checkAuthorization(["superadmin"], "users", "create"), Controller.createOrganizationAdmin);

router.put("/:id", requireAuth, checkAuthorization(["superadmin"], "users", "update"), Controller.updateUser);
router.delete("/:id", requireAuth, checkAuthorization(["superadmin"], "users", "delete"), Controller.deleteUser);

module.exports = router;