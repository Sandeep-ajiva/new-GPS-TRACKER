const Geofence = require('./model');
const Validator = require('../../helpers/validators');

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

        const { organizationId, name, type, circleCenterType, circleCenterCoordinates, circleRadius, polygon, alertOnEnter, alertOnExit } = req.body;

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
        const geofences = await Geofence.find()
            .populate('organizationId');
        return res.status(200).json({
            status: true,
            message: "Geofences Fetched Successfully",
            data: geofences
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const geofence = await Geofence.findById(req.params.id)
            .populate('organizationId');
        if (!geofence) return res.status(404).json({ status: false, message: "Geofence not found" });
        return res.status(200).json({ status: true, data: geofence });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const geofence = await Geofence.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('organizationId');
        if (!geofence) return res.status(404).json({ status: false, message: "Geofence not found" });
        return res.status(200).json({ status: true, message: "Updated Successfully", data: geofence });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const geofence = await Geofence.findByIdAndDelete(req.params.id);
        if (!geofence) return res.status(404).json({ status: false, message: "Geofence not found" });
        return res.status(200).json({ status: true, message: "Deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
