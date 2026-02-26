const POI = require('./model');
const Validator = require('../../helpers/validators');
const paginate = require("../../helpers/limitoffset");

const validatePOIData = async (data) => {
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
        await validatePOIData(req.body);

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
                    message: "Forbidden: Cannot create POI for this organization"
                });
            }
        }

        if (!organizationId) {
            return res.status(400).json({
                status: false,
                message: "OrganizationId is required",
            });
        }

        const poi = await POI.create({
            organizationId,
            name: name.trim(),
            description,
            type,
            locationType,
            locationCoordinates,
            radius: radius || 500,
            tags: tags || []
        })
        return res.status(201).json({
            status: true,
            message: "POI Created Successfully",
            data: poi
        })
    } catch (error) {
        console.error("Create POI Error:", error);
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
            POI,
            filter,
            page,
            limit,
            ['organizationId'],
            ['name', 'type', 'description'],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const poi = await POI.findById(req.params.id)
            .populate('organizationId');
        if (!poi) return res.status(404).json({ status: false, message: "POI not found" });

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const poiOrgId = poi.organizationId._id ? poi.organizationId._id.toString() : poi.organizationId.toString();
            
            if (!allowedOrgIds.includes(poiOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot access this POI"
                });
            }
        }

        return res.status(200).json({ status: true, data: poi });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const poi = await POI.findById(req.params.id);
        if (!poi) return res.status(404).json({ status: false, message: "POI not found" });

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const poiOrgId = poi.organizationId.toString();
            
            if (!allowedOrgIds.includes(poiOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot update this POI"
                });
            }
        }

        const updatedPoi = await POI.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('organizationId');
        
        return res.status(200).json({ status: true, message: "Updated Successfully", data: updatedPoi });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const poi = await POI.findById(req.params.id);
        if (!poi) return res.status(404).json({ status: false, message: "POI not found" });

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const poiOrgId = poi.organizationId.toString();
            
            if (!allowedOrgIds.includes(poiOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot delete this POI"
                });
            }
        }

        await poi.deleteOne();
        return res.status(200).json({ status: true, message: "Deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
