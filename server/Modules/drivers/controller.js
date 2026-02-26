const Driver = require('./model');
const User = require('../users/model');
const Validator = require('../../helpers/validators');
const mongoose = require('mongoose');
const paginate = require("../../helpers/limitoffset");
const bcrypt = require('bcryptjs');

const validateDriverData = async (data) => {
    const rules = {
        firstName: "required|string",
        lastName: "required|string",
        phone: "required|string",
        email: "required|string",
        licenseNumber: "required|string",
        licenseExpiry: "date",
        photo: "string",
        address: "string",
        status: "in:active,inactive,blocked",
        organizationId: "string",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

const validateDriverUserData = async (data) => {
    const rules = {
        firstName: "required|string",
        lastName: "required|string",
        phone: "required|string",
        email: "required|email",
        licenseNumber: "required|string",
        licenseExpiry: "date",
        passwordHash: "required",
        address: "string",
        status: "in:active,inactive,blocked",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

const resolveDriverOrganizationId = (payload, req) => {
    const candidate = payload?.organizationId;
    if (req.user.role === "superadmin" && candidate) {
        return candidate.toString();
    }

    if (candidate) {
        const candidateId = candidate.toString();
        if (
            req.orgScope === "ALL" ||
            (Array.isArray(req.orgScope) &&
                req.orgScope.some((id) => id.toString() === candidateId))
        ) {
            return candidateId;
        }
    }

    return req.orgId;
};

const validateUpdateDriverData = async (data) => {
    const rules = {
        firstName: "string",
        lastName: "string",
        phone: "string",
        email: "string",
        licenseNumber: "string",
        licenseExpiry: "date",
        photo: "string",
        address: "string",
        status: "in:active,inactive,blocked",
        availability: "boolean",
        assignedVehicleId: "string"
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
        "firstName",
        "lastName",
        "phone",
        "email",
        "licenseNumber",
        "licenseExpiry",
        "photo",
        "address",
        "status",
        "availability",
        "assignedVehicleId"
    ];
    if (data.organizationId) {
        allowedFields.push("organizationId");
        rules.organizationId = "string";
    }

    Object.keys(data).forEach((key) => {
        if (!allowedFields.includes(key)) {
            throw {
                status: 400,
                message: `Invalid field: ${key}`,
            };
        }
    });

    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateDriverData(req.body);

        const { assignedVehicleId, firstName, lastName, phone, email, licenseNumber, licenseExpiry, photo, address, organizationId: orgPayload } = req.body;

        let organizationId = req.orgId; // Default for non-superadmins

        if (req.user.role === "superadmin") {
            organizationId = req.body.organizationId || req.orgId;
        } else if (req.body.organizationId) {
            // If admin/user provides an org ID, verify it's within their scope
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            if (allowedOrgIds.includes(req.body.organizationId.toString())) {
                organizationId = req.body.organizationId;
            } else {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot create driver for this organization"
                });
            }
        }

        if (!organizationId) {
            return res.status(400).json({
                status: false,
                message: "OrganizationId is required",
            });
        }

        // Check for duplicate by organization-scoped unique fields
        const existingDriver = await Driver.findOne({
            organizationId,
            $or: [{ email }, { phone }, { licenseNumber }]
        });

        if (existingDriver) {
            return res.status(409).json({
                status: false,
                message: "Driver with this email, phone, or license number already exists in this organization"
            });
        }

        // Validate assignedVehicleId if provided
        if (assignedVehicleId && !mongoose.isValidObjectId(assignedVehicleId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid assigned vehicle ID"
            });
        }

        const driver = await Driver.create({
            organizationId,
            assignedVehicleId: assignedVehicleId || null,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.toLowerCase().trim(),
            licenseNumber: licenseNumber.toUpperCase().trim(),
            licenseExpiry,
            photo: photo || null,
            address: address || null,
            status: "active",
            availability: true,
            totalTrips: 0,
            rating: 0,
            joiningDate: new Date()
        });

        await driver.populate(['organizationId', 'assignedVehicleId']);

        return res.status(201).json({
            status: true,
            message: "Driver Created Successfully",
            data: driver
        });
    } catch (error) {
        console.error("Create Driver Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const { status, page, limit, search } = req.query;

        const filter = {};

        if (req.user.role !== "superadmin" && req.orgScope !== "ALL") {
            filter.organizationId = { $in: req.orgScope };
        }

        if (status) filter.status = status;

        const result = await paginate(
            Driver,
            filter,
            page,
            limit,
            [
                { path: "organizationId", select: "name" },
                { path: "assignedVehicleId", select: "vehicleNumber" }
            ],
            ["firstName", "lastName", "email", "phone"],
            search,
            { createdAt: -1 }   // 👈 newest first
        );

        return res.status(200).json(result);
    } catch (error) {
        console.error("Get All Drivers Error:", error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.getById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid driver ID"
            });
        }

        const driver = await Driver.findById(id)
            .populate('organizationId')
            .populate('assignedVehicleId');

        if (!driver) {
            return res.status(404).json({
                status: false,
                message: "Driver not found"
            });
        }

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const driverOrgId = driver.organizationId._id ? driver.organizationId._id.toString() : driver.organizationId.toString();
            
            if (!allowedOrgIds.includes(driverOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot access drivers from other organizations"
                });
            }
        }

        return res.status(200).json({
            status: true,
            data: driver
        });
    } catch (error) {
        console.error("Get Driver By ID Error:", error);
        return res.status(500).json({
            status: false,
            message: error.message
        });
    }
};

exports.update = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid driver ID"
            });
        }

        await validateUpdateDriverData(req.body);

        const driver = await Driver.findById(id);

        if (!driver) {
            return res.status(404).json({
                status: false,
                message: "Driver not found"
            });
        }

        // Verify organization ownership
        if (req.user.role !== "superadmin") {
            const allowedOrgIds = (req.orgScope || []).map(id => id.toString());
            const driverOrgId = driver.organizationId._id ? driver.organizationId._id.toString() : driver.organizationId.toString();
            
            if (!allowedOrgIds.includes(driverOrgId)) {
                return res.status(403).json({
                    status: false,
                    message: "Forbidden: Cannot update drivers from other organizations"
                });
            }
        }

        // Check for duplicate unique fields if updating them
        let targetOrganizationId = driver.organizationId;
        if (req.body.organizationId) {
            const resolvedOrgId = resolveDriverOrganizationId({ organizationId: req.body.organizationId }, req);
            if (!resolvedOrgId) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid organization selection"
                });
            }
            targetOrganizationId = resolvedOrgId;
        }

        if (req.body.email || req.body.phone || req.body.licenseNumber) {
            const query = {
                organizationId: targetOrganizationId,
                _id: { $ne: driver._id }
            };

            const orConditions = [];
            if (req.body.email) orConditions.push({ email: req.body.email.toLowerCase().trim() });
            if (req.body.phone) orConditions.push({ phone: req.body.phone.trim() });
            if (req.body.licenseNumber) orConditions.push({ licenseNumber: req.body.licenseNumber.toUpperCase().trim() });

            if (orConditions.length > 0) {
                query.$or = orConditions;
                const duplicate = await Driver.findOne(query);
                if (duplicate) {
                    return res.status(409).json({
                        status: false,
                        message: "Driver with this email, phone, or license number already exists in this organization"
                    });
                }
            }
        }

        // Validate assignedVehicleId if provided
        if (req.body.assignedVehicleId && !mongoose.isValidObjectId(req.body.assignedVehicleId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid assigned vehicle ID"
            });
        }

        if (req.body.organizationId) {
            req.body.organizationId = targetOrganizationId;
        }

        // Trim and normalize string fields
        if (req.body.firstName) req.body.firstName = req.body.firstName.trim();
        if (req.body.lastName) req.body.lastName = req.body.lastName.trim();
        if (req.body.phone) req.body.phone = req.body.phone.trim();
        if (req.body.email) req.body.email = req.body.email.toLowerCase().trim();
        if (req.body.licenseNumber) req.body.licenseNumber = req.body.licenseNumber.toUpperCase().trim();

        // Update with new fields
        Object.assign(driver, req.body);
        driver.updatedAt = new Date();
        await driver.save();

        await driver.populate(['organizationId', 'assignedVehicleId']);

        return res.status(200).json({
            status: true,
            message: "Driver Updated Successfully",
            data: driver
        });
    } catch (error) {
        console.error("Update Driver Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};

exports.delete = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid driver ID"
            });
        }

        const driver = await Driver.findById(id);

        if (!driver) {
            return res.status(404).json({
                status: false,
                message: "Driver not found"
            });
        }

        // Only superadmin can delete drivers
        if (req.user.role !== "superadmin") {
            return res.status(403).json({
                status: false,
                message: "Forbidden: Only superadmin can delete drivers"
            });
        }

        await driver.deleteOne();

        return res.status(200).json({
            status: true,
            message: "Driver Deleted Successfully"
        });
    } catch (error) {
        console.error("Delete Driver Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};

// Create Driver + User in one request (Industry Standard: Single Form Submission)
exports.createDriverUser = async (req, res) => {
    try {
        await validateDriverUserData(req.body);

        const {
            firstName, lastName, phone, email, passwordHash,
            licenseNumber, licenseExpiry, photo, address, assignedVehicleId, organizationId: organizationPayload
        } = req.body;

        if (
            organizationPayload &&
            req.user.role !== "superadmin" &&
            req.orgScope !== "ALL" &&
            (!Array.isArray(req.orgScope) ||
                !req.orgScope.some((id) => id.toString() === organizationPayload.toString()))
        ) {
            return res.status(403).json({
                status: false,
                message: "Forbidden: Cannot create driver in this organization"
            });
        }

        const organizationId = resolveDriverOrganizationId(
            { organizationId: organizationPayload },
            req
        );

        if (!organizationId) {
            return res.status(400).json({
                status: false,
                message: "OrganizationId is required"
            });
        }

        // Check for duplicate Driver (email, phone, license number)
        const existingDriver = await Driver.findOne({
            organizationId,
            $or: [{ email: email.toLowerCase() }, { phone }, { licenseNumber: licenseNumber.toUpperCase() }]
        });

        if (existingDriver) {
            return res.status(409).json({
                status: false,
                message: "Driver with this email, phone, or license number already exists in this organization"
            });
        }

        // Check for duplicate User (email, mobile)
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { mobile: phone }]
        });

        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: "User with this email or mobile already exists"
            });
        }

        // Validate assignedVehicleId if provided
        if (assignedVehicleId && !mongoose.isValidObjectId(assignedVehicleId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid assigned vehicle ID"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(passwordHash, 10);

        // Create Driver record
        const driver = await Driver.create({
            organizationId,
            assignedVehicleId: assignedVehicleId || null,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.toLowerCase().trim(),
            licenseNumber: licenseNumber.toUpperCase().trim(),
            licenseExpiry,
            photo: photo || null,
            address: address || null,
            status: "active",
            availability: true,
            totalTrips: 0,
            rating: 0,
            joiningDate: new Date(),
            createdBy: req.user._id,
        });

        // Create User record with role="driver" and link to driver
        const user = await User.create({
            organizationId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            mobile: phone.trim(),
            passwordHash: hashedPassword,
            role: "driver",
            status: "active",
            driverId: driver._id,
            assignedVehicleId: assignedVehicleId || null,
            lastLoginAt: null
        });

        // Update driver with userId reference (if needed in future)
        // You can add userId field to driver model if required

        // Populate references
        await driver.populate(['organizationId', 'assignedVehicleId']);
        await user.populate('organizationId');

        return res.status(201).json({
            status: true,
            message: "Driver and User account created successfully",
            data: {
                driver: {
                    _id: driver._id,
                    firstName: driver.firstName,
                    lastName: driver.lastName,
                    email: driver.email,
                    phone: driver.phone,
                    licenseNumber: driver.licenseNumber,
                    status: driver.status,
                    availability: driver.availability
                },
                user: {
                    _id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    mobile: user.mobile,
                    role: user.role,
                    driverId: user.driverId,
                    status: user.status
                }
            }
        });
    } catch (error) {
        console.error("Create Driver User Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};
