const Organization = require('./model');
const Validator = require('../../helpers/validators');

const validateOrganizationData = async (data) => {
    const rules = {
        name: "required",
        email: "required",
        phone: "required",
        address: "required",
    }
    const validator = new Validator(data, rules);
    await validator.validate()

}


exports.createOrganization = async (req, res) => {
    try {
        await validateOrganizationData(req.body);

        const { name, email, phone, address } = req.body;

        const existingOrg = await Organization.findOne({
            $or: [{ email }, { phone }]
        })
        if (existingOrg) {
            return res.status(409).json({
                status: false,
                message: "Organization already exist"
            })
        }
        const organization = await Organization.create({
            name,
            email: email.toLowerCase(),
            phone: phone.trim(),
            address,
            parentOrganizationId: null,
            createdBy: req.user._id,
            status: "active"
        })
        return res.status(201).json({
            status: true,
            message: "Organization Created Successfully",
            data: organization
        })
    } catch (error) {
        console.error("Create Organization Error:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
};

exports.getAll = async (req, res) => {
    try {
        const organizations = await Organization.find();
        return res.status(200).json({
            status: true,
            message: "Organizations Fetched Successfully",
            data: organizations
        });
    } catch (error) {
        console.error("Get All Organizations Error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const organization = await Organization.findById(req.params.id);
        if (!organization) return res.status(404).json({ status: false, message: "Organization not found" });
        return res.status(200).json({ status: true, message: "Organization Fetched Successfully", data: organization });
    } catch (error) {
        console.error("Get Organization By ID Error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const organization = await Organization.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!organization) return res.status(404).json({ status: false, message: "Organization not found" });
        return res.status(200).json({ status: true, message: "Organization Updated Successfully", data: organization });
    } catch (error) {
        console.error("Update Organization Error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const organization = await Organization.findByIdAndDelete(req.params.id);
        if (!organization) return res.status(404).json({ status: false, message: "Organization not found" });
        return res.status(200).json({ status: true, message: "Organization Deleted Successfully" });
    } catch (error) {
        console.error("Delete Organization Error:", error);
        return res.status(500).json({ status: false, message: error.message });
    }
};

