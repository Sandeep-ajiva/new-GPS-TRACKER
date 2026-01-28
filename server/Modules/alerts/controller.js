const Alert = require('./model');
const Validator = require('../../helpers/validators');
const paginate = require("../../helpers/limitoffset");

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
        const { page, limit, search, type, acknowledged } = req.query;
        
        const filter = {};
        if (type) filter.type = type;
        if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

        const result = await paginate(
            Alert,
            filter,
            page,
            limit,
            ['organizationId', 'gpsDeviceId', 'vehicleId'],
            ['message', 'type'],
            search
        );

        return res.status(200).json(result);
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

exports.acknowledgeAll = async (req, res) => {
    try {
        const result = await Alert.updateMany(
            { acknowledged: false },
            { acknowledged: true, acknowledgedAt: new Date() }
        );
        return res.status(200).json({
            status: true,
            message: "All alerts acknowledged",
            data: result,
        });
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

exports.deleteAll = async (req, res) => {
    try {
        const result = await Alert.deleteMany({});
        return res.status(200).json({
            status: true,
            message: "All alerts deleted",
            data: result,
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const { page, limit, search, type, acknowledged } = req.query;
        
        const filter = { vehicleId: req.params.vehicleId };
        if (type) filter.type = type;
        if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

        const result = await paginate(
            Alert,
            filter,
            page,
            limit,
            ['organizationId', 'gpsDeviceId', 'vehicleId'],
            ['message', 'type'],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getUnacknowledged = async (req, res) => {
    try {
        const { page, limit, search, type } = req.query;
        
        const filter = { acknowledged: false };
        if (type) filter.type = type;

        const result = await paginate(
            Alert,
            filter,
            page,
            limit,
            ['organizationId', 'gpsDeviceId', 'vehicleId'],
            ['message', 'type'],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
