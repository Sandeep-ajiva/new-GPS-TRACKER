const express = require("express");
const router = express.Router();
const Controller = require('./controller')

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");



router.get(
    "/",
    requireAuth,
    checkAuthorization(["superadmin", "admin"], "users", "read"),
    Controller.getAll
);

router.get("/me", requireAuth, Controller.getMe);

router.post("/login", Controller.login);

router.post(
    "/",
    requireAuth,
    checkAuthorization(["superadmin", "admin"], "users", "create"),
    Controller.create
);

router.put("/:id", requireAuth, checkAuthorization(["superadmin"], "users", "update"), Controller.updateUser);
router.delete("/:id", requireAuth, checkAuthorization(["superadmin"], "users", "delete"), Controller.deleteUser);

module.exports = router;    