const GpsHistory = require('./model');
const Validator = require('../../helpers/validators');

const validateGpsHistoryData = async (data) => {
    const rules = {
        organizationId: "required",
        vehicleId: "required",
        gpsDeviceId: "required",
        latitude: "required",
        longitude: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateGpsHistoryData(req.body);

        const { organizationId, vehicleId, gpsDeviceId, driverId, tripId, latitude, longitude, speed, heading, altitude, accuracy, timestamp } = req.body;

        const gpsHistory = await GpsHistory.create({
            organizationId,
            vehicleId,
            gpsDeviceId,
            driverId,
            tripId,
            latitude,
            longitude,
            speed: speed || 0,
            heading: heading || 0,
            altitude: altitude || 0,
            accuracy: accuracy || 0,
            timestamp: timestamp || new Date()
        })
        return res.status(201).json({
            status: true,
            message: "GPS History Created Successfully",
            data: gpsHistory
        })
    } catch (error) {
        console.error("Create GPS History Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const gpsHistories = await GpsHistory.find()
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId')
            .populate('driverId')
            .populate('tripId');
        return res.status(200).json({
            status: true,
            message: "GPS Histories Fetched Successfully",
            data: gpsHistories
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const gpsHistories = await GpsHistory.find({ vehicleId: req.params.vehicleId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId')
            .populate('driverId')
            .populate('tripId')
            .sort({ timestamp: -1 });
        return res.status(200).json({
            status: true,
            message: "GPS Histories Fetched Successfully",
            data: gpsHistories
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByDevice = async (req, res) => {
    try {
        const gpsHistories = await GpsHistory.find({ gpsDeviceId: req.params.gpsDeviceId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId')
            .populate('driverId')
            .populate('tripId')
            .sort({ timestamp: -1 });
        return res.status(200).json({
            status: true,
            message: "GPS Histories Fetched Successfully",
            data: gpsHistories
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.deleteHistory = async (req, res) => {
    try {
        await GpsHistory.deleteMany({});
        return res.status(200).json({
            status: true,
            message: "GPS History cleared successfully"
        });
    } catch (error) {
        console.error("Delete GPS History Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};
