const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken")
const User = require('../users/model');
const Validator = require('../../helpers/validators')
const Organization = require("../organizations/model")

const JWT_SECRET = process.env.JWT_SECRET;
console.log("LOGIN SECRET:", JWT_SECRET);

const validateLoginData = async (data) => {
    const rules = {
        email: "required|email",
        password: "required"
    }
    const validator = new Validator(data, rules)
    await validator.validate()
}
const validateAdminData = async (data) => {
    const rules = {
        firstName: "required",
        lastName: "required",
        email: "required|email",
        mobile: "required",
        passwordHash: "required",
    }
    const validator = new Validator(data, rules)
    await validator.validate()
}

exports.login = async (req, res) => {
    try {
        await validateLoginData(req.body);

        const { email, password } = req.body;

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({
                status: false,
                message: "Invalid email or password",
            });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({
                status: false,
                message: "Invalid email or password",
            });
        }

        if (user.status !== "active") {
            return res.status(403).json({
                status: false,
                message: "User account is inactive",
            });
        }

        const token = jwt.sign(
            {
                userId: user._id,
                role: user.role,
                organizationId: user.organizationId || null,
            },
            JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            status: true,
            message: "Login Successfully",
            token,
            user: {
                _id: user._id,
                role: user.role,
                organizationId: user.organizationId,
            },
        });
    } catch (error) {
        console.error("LOGIN ERROR 👉", error);
        return res.status(500).json({
            status: false,
            message: "Server error",
        });
    }
};


exports.createOrganizationAdmin = async (req, res) => {
    try {
        await validateAdminData(req.body);
        const {
            firstName,
            lastName,
            email,
            mobile,
            passwordHash,
            organizationId
        } = req.body

        const org = await Organization.findById(organizationId)
        if (!org) {
            return res.status(404).json({
                status: false,
                message: "Organization not found"
            })
        }

        const existingUser = await User.findOne({
            $or: [{ email }, { mobile }]
        });

        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: "user already exist"
            })
        }

        const password = await bcrypt.hash(passwordHash, 10);

        const admin = await User.create({
            organizationId,
            firstName,
            lastName,
            email,
            mobile,
            passwordHash: password,
            role: "admin",
            status: "active"
        })
        return res.status(201).json({
            status: true,
            message: "Organization Admin Created",
            data: admin,
        });

    } catch (error) {
        return res.status(500).json({
            status: false,
            message: "Internal server error",
        });
    }
}

exports.getAllAdmins = async (req, res) => {
    try {
        // 🔒 Extra safety (even though middleware already checks)
        if (req.user.role !== "superadmin") {
            return res.status(403).json({
                status: false,
                message: "Access denied",
            });
        }

        const admins = await User.find({ role: "admin" })
            .select("-passwordHash")
            .populate("organizationId", "name email phone")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            status: true,
            totalAdmins: admins.length,
            data: admins,
        });

    } catch (error) {
        console.error("Get All Admins Error:", error);
        return res.status(500).json({
            status: false,
            message: "Server error",
        });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { firstName, lastName, email, mobile, status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { firstName, lastName, email, mobile, status },
            { new: true }
        ).select("-passwordHash");

        if (!user) return res.status(404).json({ status: false, message: "User not found" });

        return res.status(200).json({
            status: true,
            message: "User updated successfully",
            data: user
        });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ status: false, message: "User not found" });
        return res.status(200).json({ status: true, message: "User deleted successfully" });
    } catch (error) {
        return res.status(500).json({ status: false, message: error.message });
    }
};

