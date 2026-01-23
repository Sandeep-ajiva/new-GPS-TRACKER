const GpsLiveData = require('./model');
const Validator = require('../../helpers/validators');

const validateGpsLiveDataData = async (data) => {
    const rules = {
        organizationId: "required",
        vehicleId: "required",
        gpsDeviceId: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateGpsLiveDataData(req.body);
        const { organizationId, vehicleId, gpsDeviceId, latitude, longitude, currentLocation, currentSpeed, fuelPercentage, currentMileage, engineStatus, ignitionStatus, movementStatus, batteryLevel, signalStrength, acStatus, temperature } = req.body;

        // Upsert live data by gpsDeviceId so there is one latest record per device
        const prev = await GpsLiveData.findOne({ gpsDeviceId });
        const now = new Date();

        const update = {
            organizationId,
            vehicleId,
            gpsDeviceId,
            latitude: latitude || 0,
            longitude: longitude || 0,
            currentLocation,
            currentSpeed: currentSpeed || 0,
            fuelPercentage: fuelPercentage || 0,
            currentMileage: currentMileage || 0,
            engineStatus: engineStatus || false,
            ignitionStatus: ignitionStatus || false,
            movementStatus: movementStatus || (currentSpeed && currentSpeed > 0 ? "moving" : "stopped"),
            batteryLevel: batteryLevel || 0,
            signalStrength: signalStrength || 0,
            acStatus: acStatus || false,
            temperature
        };

        if (ignitionStatus && !(prev && prev.ignitionStatus)) update.lastIgnitionOn = now;
        if (!ignitionStatus && prev && prev.ignitionStatus) update.lastIgnitionOff = now;

        const gpsLiveData = await GpsLiveData.findOneAndUpdate(
            { gpsDeviceId },
            { $set: update },
            { upsert: true, new: true }
        );
        return res.status(201).json({
            status: true,
            message: "GPS Live Data Created Successfully",
            data: gpsLiveData
        })
    } catch (error) {
        console.error("Create GPS Live Data Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const liveData = await GpsLiveData.find()
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        return res.status(200).json({
            status: true,
            message: "GPS Live Data Fetched Successfully",
            data: liveData
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const liveData = await GpsLiveData.findOne({ vehicleId: req.params.vehicleId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        if (!liveData) return res.status(404).json({ status: false, message: "GPS Live Data not found" });
        return res.status(200).json({ status: true, data: liveData });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByDevice = async (req, res) => {
    try {
        const liveData = await GpsLiveData.find({ gpsDeviceId: req.params.gpsDeviceId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        return res.status(200).json({
            status: true,
            message: "GPS Live Data Fetched Successfully",
            data: liveData
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
