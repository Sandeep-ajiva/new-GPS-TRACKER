const GpsDevice = require('./model');
const Validator = require('../../helpers/validators');
const mongoose = require('mongoose');

const validateCreateGpsDevice = async (data, user) => {
    const rules = {
        imei: "required|string",
        deviceModel: "required|string",
        manufacturer: "string",
        simNumber: "string",
        serialNumber: "string",
        firmwareVersion: "string",
        hardwareVersion: "string",
        warrantyExpiry: "date",
        status: "in:active,inactive"
    };

    if (user.role === "superadmin") {
        rules.organizationId = "required|string";
    }

    const validator = new Validator(data, rules);
    await validator.validate();
};

const validateUpdateGpsDevice = async (data) => {
    const rules = {
        imei: "string",
        deviceModel: "string",
        manufacturer: "string",
        simNumber: "string",
        serialNumber: "string",
        firmwareVersion: "string",
        hardwareVersion: "string",
        warrantyExpiry: "date",
        status: "in:active,inactive",
        connectionStatus: "in:online,offline"
    };

    // Empty string check
    Object.keys(data).forEach((key) => {
        if (data[key] === "") {
            throw {
                status: 400,
                message: `${key} cannot be empty`,
            };
        }
    });

    // Allowed fields only
    const allowedFields = [
        "imei",
        "deviceModel",
        "manufacturer",
        "simNumber",
        "serialNumber",
        "firmwareVersion",
        "hardwareVersion",
        "warrantyExpiry",
        "status",
        "connectionStatus"
    ];

    Object.keys(data).forEach((key) => {
        if (!allowedFields.includes(key)) {
            throw {
                status: 400,
                message: `Invalid field: ${key}`,
            };
        }
    });

    const validator = new Validator(data, rules);
    await validator.validate();
};

exports.create = async (req, res) => {
    try {
        await validateCreateGpsDevice(req.body, req.user);

        const { imei, deviceModel, manufacturer, simNumber, serialNumber, firmwareVersion, hardwareVersion, warrantyExpiry, status } = req.body;

        const organizationId =
            req.user.role === "superadmin"
                ? req.body.organizationId
                : req.orgId;

        if (!organizationId) {
            return res.status(400).json({
                status: false,
                message: "OrganizationId is required",
            });
        }

        const existingDevice = await GpsDevice.findOne({
            imei: imei.trim(),
            organizationId
        });

        if (existingDevice) {
            return res.status(409).json({
                status: false,
                message: "GPS Device with this IMEI already exists in this organization"
            });
        }

        const gpsDevice = await GpsDevice.create({
            organizationId,
            imei: imei.trim(),
            deviceModel: deviceModel.trim(),
            manufacturer: manufacturer?.trim() || null,
            simNumber: simNumber?.trim() || null,
            serialNumber: serialNumber?.trim() || null,
            firmwareVersion: firmwareVersion?.trim() || null,
            hardwareVersion: hardwareVersion?.trim() || null,
            connectionStatus: "offline",
            warrantyExpiry: warrantyExpiry || null,
            status: status || "active"
        });

        return res.status(201).json({
            status: true,
            message: "GPS Device created successfully",
            data: gpsDevice
        });
    } catch (error) {
        console.error("Create GPS Device Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
        });
    }
};

const paginate = require("../../helpers/limitoffset");

exports.getAll = async (req, res) => {
    try {
        const { status, connectionStatus, page, limit, search } = req.query;

        const filter = {};

        if (req.user.role !== "superadmin") {
            filter.organizationId = req.orgId;
        }

        if (status) filter.status = status;
        if (connectionStatus) filter.connectionStatus = connectionStatus;

        const result = await paginate(
            GpsDevice,
            filter,
            page,
            limit,
            ["organizationId"],
            ["imei", "deviceModel", "manufacturer"],
            search
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get All GPS Devices Error:", error);
        return res.status(500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid ID"
            });
        }

        const device = await GpsDevice.findById(id).populate('organizationId');

        if (!device) {
            return res.status(404).json({
                status: false,
                message: "GPS Device not found"
            });
        }

        if (
            req.user.role !== "superadmin" &&
            device.organizationId.toString() !== req.orgId.toString()
        ) {
            return res.status(403).json({
                status: false,
                message: "Forbidden"
            });
        }

        return res.json({
            status: true,
            data: device,
        });
    } catch (error) {
        console.error("Get GPS Device By ID Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
            errors: error.errors || null
        });
    }
};

exports.update = async (req, res) => {
    try {
        await validateUpdateGpsDevice(req.body);

        const device = await GpsDevice.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                status: false,
                message: "GPS Device not found"
            });
        }

        if (
            req.user.role !== "superadmin" &&
            device.organizationId.toString() !== req.orgId.toString()
        ) {
            return res.status(403).json({
                status: false,
                message: "Forbidden"
            });
        }

        // Check for duplicate IMEI if updating it
        if (req.body.imei) {
            const duplicate = await GpsDevice.findOne({
                imei: req.body.imei.trim(),
                organizationId: device.organizationId,
                _id: { $ne: device._id }
            });

            if (duplicate) {
                return res.status(409).json({
                    status: false,
                    message: "GPS Device with this IMEI already exists in this organization"
                });
            }

            req.body.imei = req.body.imei.trim();
        }

        // Trim string fields
        const stringFields = ['deviceModel', 'manufacturer', 'simNumber', 'serialNumber', 'firmwareVersion', 'hardwareVersion'];
        stringFields.forEach(field => {
            if (req.body[field]) {
                req.body[field] = req.body[field].trim();
            }
        });

        // Update with new fields
        Object.assign(device, req.body);
        device.updatedAt = new Date();
        await device.save();

        await device.populate('organizationId');

        return res.json({
            status: true,
            message: "GPS Device updated successfully",
            data: device,
        });
    } catch (error) {
        console.error("Update GPS Device Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
            errors: error.errors || null
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const device = await GpsDevice.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                status: false,
                message: "GPS Device not found"
            });
        }

        if (req.user.role !== "superadmin") {
            return res.status(403).json({
                status: false,
                message: "Forbidden"
            });
        }

        await device.deleteOne();

        return res.json({
            status: true,
            message: "GPS Device deleted successfully",
        });
    } catch (error) {
        console.error("Delete GPS Device Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
            errors: error.errors || null
        });
    }
};

exports.getAvailable = async (req, res) => {
    try {
        const filter = { connectionStatus: "online" };

        if (req.user.role !== "superadmin") {
            filter.organizationId = req.orgId;
        }

        const devices = await GpsDevice.find(filter)
            .populate('organizationId');

        return res.status(200).json({
            status: true,
            message: "Available GPS Devices fetched successfully",
            data: devices
        });
    } catch (error) {
        console.error("Get Available GPS Devices Error:", error);
        return res.status(500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};

exports.updateConnectionStatus = async (req, res) => {
    try {
        const { connectionStatus } = req.body;

        if (!connectionStatus || !["online", "offline"].includes(connectionStatus)) {
            return res.status(400).json({
                status: false,
                message: "Invalid connection status. Must be 'online' or 'offline'"
            });
        }

        const device = await GpsDevice.findById(req.params.id);

        if (!device) {
            return res.status(404).json({
                status: false,
                message: "GPS Device not found"
            });
        }

        if (
            req.user.role !== "superadmin" &&
            device.organizationId.toString() !== req.orgId.toString()
        ) {
            return res.status(403).json({
                status: false,
                message: "Forbidden"
            });
        }

        device.connectionStatus = connectionStatus;
        device.updatedAt = new Date();
        await device.save();

        await device.populate('organizationId');

        return res.json({
            status: true,
            message: "GPS Device connection status updated successfully",
            data: device,
        });
    } catch (error) {
        console.error("Update Connection Status Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
            errors: error.errors || null
        });
    }
};
