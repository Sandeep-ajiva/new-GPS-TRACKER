const VehicleMapping = require('./model');
const Validator = require('../../helpers/validators');

const validateVehicleMappingData = async (data) => {
    const rules = {
        organizationId: "required",
        vehicleId: "required",
        gpsDeviceId: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.assign = async (req, res) => {
    try {
        await validateVehicleMappingData(req.body);

        const { organizationId, vehicleId, gpsDeviceId } = req.body;

        // Check if mapping already exists
        const existingMapping = await VehicleMapping.findOne({
            vehicleId,
            gpsDeviceId,
            unassignedAt: null
        });
        if (existingMapping) {
            return res.status(409).json({
                status: false,
                message: "Vehicle and GPS Device mapping already exist"
            })
        }

        const vehicleMapping = await VehicleMapping.create({
            organizationId,
            vehicleId,
            gpsDeviceId,
            assignedAt: new Date(),
            unassignedAt: null
        })
        return res.status(201).json({
            status: true,
            message: "Device Assigned to Vehicle Successfully",
            data: vehicleMapping
        })
    } catch (error) {
        console.error("Create Vehicle Mapping Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getActiveMappings = async (req, res) => {
    try {
        const mappings = await VehicleMapping.find({ unassignedAt: null })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        return res.status(200).json({
            status: true,
            message: "Active Mappings Fetched Successfully",
            data: mappings
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByVehicle = async (req, res) => {
    try {
        const mappings = await VehicleMapping.find({ vehicleId: req.params.vehicleId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        return res.status(200).json({
            status: true,
            message: "Vehicle Mappings Fetched Successfully",
            data: mappings
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getByDevice = async (req, res) => {
    try {
        const mappings = await VehicleMapping.find({ gpsDeviceId: req.params.gpsDeviceId })
            .populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        return res.status(200).json({
            status: true,
            message: "Device Mappings Fetched Successfully",
            data: mappings
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.unassign = async (req, res) => {
    try {
        const { vehicleId, gpsDeviceId } = req.body;
        const mapping = await VehicleMapping.findOneAndUpdate(
            { vehicleId, gpsDeviceId, unassignedAt: null },
            { unassignedAt: new Date() },
            { new: true }
        ).populate('organizationId')
            .populate('vehicleId')
            .populate('gpsDeviceId');
        if (!mapping) return res.status(404).json({ status: false, message: "Active mapping not found" });
        return res.status(200).json({ status: true, message: "Device Unassigned from Vehicle", data: mapping });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
