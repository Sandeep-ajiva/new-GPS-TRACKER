const GpsDevice = require('./model');
const Validator = require('../../helpers/validators');

const validateGpsDeviceData = async (data) => {
    const rules = {
        organizationId: "required",
        imei: "required",
        deviceModel: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateGpsDeviceData(req.body);

        const { organizationId, imei, deviceModel, manufacturer, simNumber, serialNumber, firmwareVersion, hardwareVersion, warrantyExpiry } = req.body;

        const existingDevice = await GpsDevice.findOne({ imei });
        if (existingDevice) {
            return res.status(409).json({
                status: false,
                message: "GPS Device with this IMEI already exist"
            })
        }

        const gpsDevice = await GpsDevice.create({
            organizationId,
            imei: imei.trim(),
            deviceModel: deviceModel.trim(),
            manufacturer: manufacturer?.trim(),
            simNumber: simNumber?.trim(),
            serialNumber: serialNumber?.trim(),
            firmwareVersion: firmwareVersion?.trim(),
            hardwareVersion: hardwareVersion?.trim(),
            connectionStatus: "offline",
            warrantyExpiry
        })
        return res.status(201).json({
            status: true,
            message: "GPS Device Created Successfully",
            data: gpsDevice
        })
    } catch (error) {
        console.error("Create GPS Device Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const devices = await GpsDevice.find()
            .populate('organizationId');
        return res.status(200).json({
            status: true,
            message: "GPS Devices Fetched Successfully",
            data: devices
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const device = await GpsDevice.findById(req.params.id)
            .populate('organizationId');
        if (!device) return res.status(404).json({ status: false, message: "GPS Device not found" });
        return res.status(200).json({ status: true, data: device });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const device = await GpsDevice.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('organizationId');
        if (!device) return res.status(404).json({ status: false, message: "GPS Device not found" });
        return res.status(200).json({ status: true, message: "Updated Successfully", data: device });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const device = await GpsDevice.findByIdAndDelete(req.params.id);
        if (!device) return res.status(404).json({ status: false, message: "GPS Device not found" });
        return res.status(200).json({ status: true, message: "Deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getAvailable = async (req, res) => {
    try {
        const devices = await GpsDevice.find({ connectionStatus: "online" })
            .populate('organizationId');
        return res.status(200).json({
            status: true,
            message: "Available GPS Devices Fetched Successfully",
            data: devices
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.updateConnectionStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const device = await GpsDevice.findByIdAndUpdate(
            req.params.id,
            { connectionStatus: status },
            { new: true }
        ).populate('organizationId');
        if (!device) return res.status(404).json({ status: false, message: "GPS Device not found" });
        return res.status(200).json({ status: true, message: "Connection Status Updated", data: device });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
