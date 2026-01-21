const VehicleDailyStats = require('./model');
const Validator = require('../../helpers/validators');

const validateVehicleDailyStatsData = async (data) => {
    const rules = {
        organizationId: "required",
        vehicleId: "required",
        date: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateVehicleDailyStatsData(req.body);

        const { organizationId, vehicleId, gpsDeviceId, date, totalDistance, maxSpeed, avgSpeed, runningTime, idleTime, stoppedTime, firstIgnitionOn, lastIgnitionOff } = req.body;

        const vehicleDailyStats = await VehicleDailyStats.create({
            organizationId,
            vehicleId,
            gpsDeviceId,
            date,
            totalDistance: totalDistance || 0,
            maxSpeed: maxSpeed || 0,
            avgSpeed: avgSpeed || 0,
            runningTime: runningTime || 0,
            idleTime: idleTime || 0,
            stoppedTime: stoppedTime || 0,
            firstIgnitionOn,
            lastIgnitionOff
        })
        return res.status(201).json({
            status: true,
            message: "Vehicle Daily Stats Created Successfully",
            data: vehicleDailyStats
        })
    } catch (error) {
        console.error("Create Vehicle Daily Stats Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const stats = await VehicleDailyStats.find()
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        return res.status(200).json({
            status: true,
            message: "Vehicle Daily Stats Fetched Successfully",
            data: stats
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const stats = await VehicleDailyStats.find({ vehicleId: req.params.vehicleId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId')
            .sort({ date: -1 });
        return res.status(200).json({
            status: true,
            message: "Vehicle Daily Stats Fetched Successfully",
            data: stats
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicleAndDate = async (req, res) => {
    try {
        const { vehicleId, date } = req.params;
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const stats = await VehicleDailyStats.find({
            vehicleId,
            date: { $gte: startOfDay, $lte: endOfDay }
        })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        
        if (!stats || stats.length === 0) {
            return res.status(404).json({ status: false, message: "Stats not found" });
        }
        return res.status(200).json({ status: true, data: stats[0] });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
