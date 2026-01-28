const express = require("express");
const router = express.Router();

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");
const checkOrganization = require("../../middleware/checkOrganization");
const { handleLogoUpload } = require("../../middleware/multerUpload");

const Controller = require("./controller");

/* =========================
   CREATE
========================= */

// 1️⃣ Create root organization + admin (INITIAL SETUP)
router.post(
  "/",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "create"),
  handleLogoUpload,
  Controller.createOrganizationWithAdmin
);

// 2️⃣ Create sub-organization + manager
router.post(
  "/sub",
  requireAuth,
  checkAuthorization(["superadmin", "admin"], "organizations", "create"),
  checkOrganization,
  handleLogoUpload,
  Controller.createSubOrgWithManager
);

/* =========================
   READ
========================= */

// 3️⃣ Get organizations (scoped)
router.get(
  "/",
  requireAuth,
  checkAuthorization(["superadmin", "admin"], "organizations", "read"),
  checkOrganization,
  Controller.getAll
);

// 4️⃣ Get only sub-organizations of current org
router.get(
  "/sub",
  requireAuth,
  checkAuthorization(["superadmin", "admin"], "organizations", "read"),
  checkOrganization,
  Controller.getSubOrganizations
);

// 5️⃣ Get organization by id (superadmin only)
router.get(
  "/:id",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "read"),
  Controller.getById
);

/* =========================
   UPDATE
========================= */

router.put(
  "/:id",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "update"),
  handleLogoUpload,
  Controller.update
);

/* =========================
   DELETE
========================= */

router.delete(
  "/:id",
  requireAuth,
  checkAuthorization(["superadmin"], "organizations", "delete"),
  Controller.delete
);

module.exports = router;
