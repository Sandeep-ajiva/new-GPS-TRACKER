const GpsHistory = require('./model');
const Validator = require('../../helpers/validators');
const paginate = require("../../helpers/limitoffset");

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
        const { page, limit, search, tripId } = req.query;
        
        const filter = {};
        if (tripId) filter.tripId = tripId;

        const result = await paginate(
            GpsHistory,
            filter,
            page,
            limit,
            ['organizationId', 'vehicleId', 'gpsDeviceId', 'driverId', 'tripId'],
            [],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const { page, limit, search, tripId } = req.query;
        
        const filter = { vehicleId: req.params.vehicleId };
        if (tripId) filter.tripId = tripId;

        const result = await paginate(
            GpsHistory,
            filter,
            page,
            limit,
            ['organizationId', 'vehicleId', 'gpsDeviceId', 'driverId', 'tripId'],
            [],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByDevice = async (req, res) => {
    try {
        const { page, limit, search, tripId } = req.query;
        
        const filter = { gpsDeviceId: req.params.gpsDeviceId };
        if (tripId) filter.tripId = tripId;

        const result = await paginate(
            GpsHistory,
            filter,
            page,
            limit,
            ['organizationId', 'vehicleId', 'gpsDeviceId', 'driverId', 'tripId'],
            [],
            search
        );

        return res.status(200).json(result);
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
