const express = require("express");
const router = express.Router();
const Controller = require('./controller')

const verifyToken = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");
const { handleLogoUpload } = require("../../middleware/multerUpload");

router.get(
    "/admins",
    verifyToken,
    checkAuthorization(["superadmin"], "users", "read"),
    Controller.getAllAdmins
);

router.post("/login", Controller.login);

router.post("/organization-admin", verifyToken,
    checkAuthorization(["superadmin"], "users", "create"), 
    handleLogoUpload,
    Controller.createOrganizationWithAdmin);


router.put("/:id", verifyToken, checkAuthorization(["superadmin"], "users", "update"), Controller.updateUser);
router.delete("/:id", verifyToken, checkAuthorization(["superadmin"], "users", "delete"), Controller.deleteUser);

module.exports = router;    