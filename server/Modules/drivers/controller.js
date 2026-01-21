const Driver = require('./model');
const Validator = require('../../helpers/validators');

const validateDriverData = async (data) => {
    const rules = {
        organizationId: "required",
        firstName: "required",
        lastName: "required",
        phone: "required",
        email: "required",
        licenseNumber: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()
}

exports.create = async (req, res) => {
    try {
        await validateDriverData(req.body);

        const { organizationId, assignedVehicleId, firstName, lastName, phone, email, licenseNumber, licenseExpiry, photo, address } = req.body;

        const existingDriver = await Driver.findOne({
            $or: [{ email }, { phone }, { licenseNumber }]
        })
        if (existingDriver) {
            return res.status(409).json({
                status: false,
                message: "Driver already exist"
            })
        }

        const driver = await Driver.create({
            organizationId,
            assignedVehicleId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.toLowerCase().trim(),
            licenseNumber: licenseNumber.trim(),
            licenseExpiry,
            photo,
            address,
            status: "active",
            availability: true,
            totalTrips: 0,
            rating: 0,
            joiningDate: new Date()
        })
        return res.status(201).json({
            status: true,
            message: "Driver Created Successfully",
            data: driver
        })
    } catch (error) {
        console.error("Create Driver Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const drivers = await Driver.find()
            .populate('organizationId')
            .populate('assignedVehicleId');
        return res.status(200).json({
            status: true,
            message: "Drivers Fetched Successfully",
            data: drivers
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const driver = await Driver.findById(req.params.id)
            .populate('organizationId')
            .populate('assignedVehicleId');
        if (!driver) return res.status(404).json({ status: false, message: "Driver not found" });
        return res.status(200).json({ status: true, data: driver });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true })
            .populate('organizationId')
            .populate('assignedVehicleId');
        if (!driver) return res.status(404).json({ status: false, message: "Driver not found" });
        return res.status(200).json({ status: true, message: "Updated Successfully", data: driver });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const driver = await Driver.findByIdAndDelete(req.params.id);
        if (!driver) return res.status(404).json({ status: false, message: "Driver not found" });
        return res.status(200).json({ status: true, message: "Deleted Successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};
