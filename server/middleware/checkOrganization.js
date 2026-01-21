module.exports = function checkOrganization(req, res, next) {
    try {
        const user = req.user;

        if (!user || !user.role) {
            return res.status(401).json({
                status: false,
                message: "Unauthorized",
            });
        }

        if (user.role === "superadmin") {
            return next();
        }

        if (!user.organizationId) {
            return res.status(403).json({
                status: false,
                message: "Organization context missing",
            });
        }
        req.orgId = user.organizationId
        next()
    } catch (error) {
        console.error("checkOrganization error:", error);
        return res.status(500).json({
            status: false,
            message: "Organization validation failed",
        });
    }
}
