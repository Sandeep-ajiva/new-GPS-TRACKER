const Alert = require('./model');
const Validator = require('../../helpers/validators');

const validateAlertData = async (data) => {
    const rules = {
        organizationId: "required",
        gpsDeviceId: "required",
        vehicleId: "required",
        type: "required",
        message: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateAlertData(req.body);

        const { organizationId, gpsDeviceId, vehicleId, type, message, locationType, locationCoordinates } = req.body;

        const alert = await Alert.create({
            organizationId,
            gpsDeviceId,
            vehicleId,
            type,
            message,
            locationType,
            locationCoordinates,
            acknowledged: false,
        })
        return res.status(201).json({
            status: true,
            message: "Alert Created Successfully",
            data: alert
        })
    } catch (error) {
        console.error("Create Alert Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const alerts = await Alert.find()
            .populate('organizationId')
            .populate('gpsDeviceId')
            .populate('vehicleId');
        return res.status(200).json({
            status: true,
            message: "Alerts Fetched Successfully",
            data: alerts
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const alert = await Alert.findById(req.params.id)
            .populate('organizationId')
            .populate('gpsDeviceId')
            .populate('vehicleId');
        if (!alert) return res.status(404).json({ status: false, message: "Alert not found" });
        return res.status(200).json({ status: true, data: alert });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('organizationId')
            .populate('gpsDeviceId')
            .populate('vehicleId');
        if (!alert) return res.status(404).json({ status: false, message: "Alert not found" });
        return res.status(200).json({ status: true, message: "Updated Successfully", data: alert });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.acknowledge = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndUpdate(
            req.params.id,
            { acknowledged: true, acknowledgedAt: new Date() },
            { new: true }
        ).populate('organizationId')
            .populate('gpsDeviceId')
            .populate('vehicleId');
        if (!alert) return res.status(404).json({ status: false, message: "Alert not found" });
        return res.status(200).json({ status: true, message: "Alert Acknowledged", data: alert });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const alert = await Alert.findByIdAndDelete(req.params.id);
        if (!alert) return res.status(404).json({ status: false, message: "Alert not found" });
        return res.status(200).json({ status: true, message: "Deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const alerts = await Alert.find({ vehicleId: req.params.vehicleId })
            .populate('organizationId')
            .populate('gpsDeviceId')
            .populate('vehicleId')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            status: true,
            message: "Alerts Fetched Successfully",
            data: alerts
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getUnacknowledged = async (req, res) => {
    try {
        const alerts = await Alert.find({ acknowledged: false })
            .populate('organizationId')
            .populate('gpsDeviceId')
            .populate('vehicleId')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            status: true,
            message: "Unacknowledged Alerts Fetched Successfully",
            data: alerts
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
