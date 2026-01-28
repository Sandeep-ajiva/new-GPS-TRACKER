const Organization = require("../Modules/organizations/model");

module.exports = async function checkOrganization(req, res, next) {
  try {
    const user = req.user;

    if (!user || !user.role) {
      return res.status(401).json({
        status: false,
        message: "Unauthorized",
      });
    }

    // 🔥 superadmin = all org access
    if (user.role === "superadmin") {
      req.orgScope = "ALL";
      return next();
    }

    if (!user.organizationId) {
      return res.status(403).json({
        status: false,
        message: "Organization context missing",
      });
    }

    req.orgId = user.organizationId;

    // 🔥 fetch parent + child orgs
    const orgs = await Organization.find({
      $or: [
        { _id: user.organizationId },
        { parentOrganizationId: user.organizationId },
      ],
    }).select("_id");

    req.orgScope = orgs.map((o) => o._id);

    next();
  } catch (error) {
    console.error("checkOrganization error:", error);
    return res.status(500).json({
      status: false,
      message: "Organization validation failed",
    });
  }
};
