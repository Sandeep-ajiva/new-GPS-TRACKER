const Geofence = require('./model');
const Validator = require('../../helpers/validators');
const paginate = require("../../helpers/limitoffset");

const validateGeofenceData = async (data) => {
    const rules = {
        organizationId: "required",
        name: "required",
        type: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateGeofenceData(req.body);

        let organizationId = req.orgId;

        if (req.user.role === "superadmin") {
            organizationId = req.body.organizationId || req.orgId;
        } else if (req.body.organizationId) {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            if (allowedOrgIds.includes(req.body.organizationId.toString())) {
                organizationId = req.body.organizationId;
            } else {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot create geofence for this organization"
                });
            }
        }

        if (!organizationId) {
            return res.status(400).json({
                status: false,
                message: "OrganizationId is required",
            });
        }

        const geofence = await Geofence.create({
            organizationId,
            name: name.trim(),
            type,
            circleCenterType,
            circleCenterCoordinates,
            circleRadius,
            polygon,
            alertOnEnter: alertOnEnter || false,
            alertOnExit: alertOnExit || false
        })
        return res.status(201).json({
            status: true,
            message: "Geofence Created Successfully",
            data: geofence
        })
    } catch (error) {
        console.error("Create Geofence Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const { page, limit, search, type } = req.query;
        
        const filter = {};
        if (req.user.role !== "superadmin" && req.orgScope !== "ALL") {
            filter.organizationId = { $in: req.orgScope };
        }
        if (type) filter.type = type;

        const result = await paginate(
            Geofence,
            filter,
            page,
            limit,
            ['organizationId'],
            ['name', 'type'],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const geofence = await Geofence.findById(req.params.id)
            .populate('organizationId');
        if (!geofence) return res.status(404).json({ status: false, message: "Geofence not found" });

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const geofenceOrgId = geofence.organizationId._id ? geofence.organizationId._id.toString() : geofence.organizationId.toString();
            
            if (!allowedOrgIds.includes(geofenceOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot access this geofence"
                });
            }
        }

        return res.status(200).json({ status: true, data: geofence });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const geofence = await Geofence.findById(req.params.id);
        if (!geofence) return res.status(404).json({ status: false, message: "Geofence not found" });

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const geofenceOrgId = geofence.organizationId.toString();
            
            if (!allowedOrgIds.includes(geofenceOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot update this geofence"
                });
            }
        }

        const updatedGeofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('organizationId');
        
        return res.status(200).json({ status: true, message: "Updated Successfully", data: updatedGeofence });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const geofence = await Geofence.findById(req.params.id);
        if (!geofence) return res.status(404).json({ status: false, message: "Geofence not found" });

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const geofenceOrgId = geofence.organizationId.toString();
            
            if (!allowedOrgIds.includes(geofenceOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot delete this geofence"
                });
            }
        }

        await geofence.deleteOne();
        return res.status(200).json({ status: true, message: "Deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
