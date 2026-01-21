const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");
const { handleLogoUpload } = require("../../middleware/multerUpload");

const Controller = require('./controller')

router.post(
  "/",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "create"),
  handleLogoUpload,
  Controller.createOrganization
);

router.get("/", requireAuth, checkAuthorization(["superadmin" ], "organizations", "read"), Controller.getAll);
router.get("/sub", requireAuth, checkAuthorization(["superadmin" , "admin"], "organizations", "read"), Controller.getSubOrganizations);
router.get("/:id", requireAuth, checkAuthorization(["superadmin"], "organizations", "read"), Controller.getById);

router.post(
  "/sub-organization",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "create"),
  handleLogoUpload,
  Controller.createSubOrganization
);

router.post(
  "/with-manager",
  requireAuth,
  checkAuthorization(["superadmin" , "admin"], "organizations", "create"),
  handleLogoUpload,
  Controller.createSubOrgWithManager
);

router.put("/:id", requireAuth, checkAuthorization(["superadmin"], "organizations", "update"), handleLogoUpload, Controller.update);
router.delete("/:id", requireAuth, checkAuthorization(["superadmin"], "organizations", "delete"), Controller.delete);


module.exports = router;
