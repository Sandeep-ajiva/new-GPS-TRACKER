module.exports = function checkOrganization(req, res, next) {
    try {
        const user = req.user;

        if (!user || !user.role) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized",
            });
        }

        // For superadmin, get organizationId from body or user
        if (user.role === "superadmin") {
            req.orgId = req.body.organizationId || user.organizationId || null;
            return next();
        }

        // For other roles, use user's organizationId
        if (!user.organizationId) {
            return res.status(403).json({
                status: false,
                message: "Organization context missing",
            });
        }
        req.orgId = user.organizationId
        console.log(req.orgId);
        next()
    } catch (error) {
        console.error("checkOrganization error:", error);
        return res.status(500).json({
            status: false,
            message: "Organization validation failed",
        });
    }
}
