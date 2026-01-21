const express = require("express");
const router = express.Router();
const Controller = require("./controller");

const requireAuth = require("../../middleware/verifyToken");
const checkAuthorization = require("../../middleware/checkAuthorization");

// Get History (Replay path)
router.get(
  "/",
  requireAuth,
  checkAuthorization(["admin", "superadmin"], "gpsHistory", "read"),
  Controller.getAll
);

// Clear History (Cleanup)
router.delete(
  "/",
  requireAuth,
  checkAuthorization(["superadmin"], "gpsHistory", "delete"),
  Controller.deleteHistory
);

module.exports = router;
