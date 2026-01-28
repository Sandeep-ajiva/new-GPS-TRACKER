const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../users/model");
const Validator = require("../../helpers/validators");
const Organization = require("../organizations/model");

const JWT_SECRET = process.env.JWT_SECRET;
console.log("LOGIN SECRET:", JWT_SECRET);

const validateLoginData = async (data) => {
  const rules = {
    email: "required|email",
    password: "required",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};
const validateAdminData = async (data) => {
  const rules = {
    firstName: "required",
    lastName: "required",
    email: "required|email",
    mobile: "required",
    passwordHash: "required",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

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
      { expiresIn: "1d" },
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

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-passwordHash")
      .populate("organizationId", "name email phone");
    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });
    return res.json({ status: true, data: user });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const query = {};

    // Authorization & Filtering
    if (req.user.role === "superadmin") {
      // Superadmin can filter by any org or see all
      if (req.query.organizationId) {
        query.organizationId = req.query.organizationId;
      }
    } else if (req.user.role === "admin") {
      // Admin can filter by org (usually their own or sub-orgs)
      if (req.query.organizationId) {
        query.organizationId = req.query.organizationId;
      } else if (req.user.organizationId) {
        query.organizationId = req.user.organizationId;
      }
    } else {
      // Manager/Other roles restricted to their own org
      if (req.user.organizationId) {
        query.organizationId = req.user.organizationId;
      } else {
        return res
          .status(403)
          .json({ status: false, message: "Access denied" });
      }
    }

    const users = await User.find(query)
      .select("-passwordHash")
      .populate("organizationId", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get All Users Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};

exports.create = async (req, res) => {
  try {
    await validateAdminData(req.body); // Reusing existing validator for now, requires firstName, lastName, etc.

    const {
      firstName,
      lastName,
      email,
      mobile,
      passwordHash,
      organizationId,
      role,
      status,
    } = req.body;

    // Role validation
    const allowedRoles = ["admin", "manager", "driver"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ status: false, message: "Invalid role" });
    }

    // Organization Check
    let finalOrgId = organizationId;
    if (req.user.role !== "superadmin") {
      // Force assign to creator's org
      finalOrgId = req.user.organizationId;
    }

    if (!finalOrgId && role !== "superadmin") {
      // Superadmin usually doesn't need org, but new user might
      // If creating strict Org user
      return res
        .status(400)
        .json({ status: false, message: "Organization is required" });
    }

    if (finalOrgId) {
      const org = await Organization.findById(finalOrgId);
      if (!org)
        return res
          .status(404)
          .json({ status: false, message: "Organization not found" });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile }],
    });

    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: "User or Mobile already exists",
      });
    }

    const password = await bcrypt.hash(passwordHash, 10);

    const newUser = await User.create({
      organizationId: finalOrgId,
      firstName,
      lastName,
      email: email.toLowerCase(),
      mobile,
      passwordHash: password,
      role,
      status: status || "active",
    });

    // Loophole: If Admin created, update Org?
    // Old logic: org.adminUser = admin._id
    // We can keep this if role is 'admin'
    if (role === "admin" && finalOrgId) {
      await Organization.findByIdAndUpdate(finalOrgId, {
        adminUser: newUser._id,
      });
    }

    return res.status(201).json({
      status: true,
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, email, mobile, status },
      { new: true },
    ).select("-passwordHash");

    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });
    return res
      .status(200)
      .json({ status: true, message: "User deleted successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
exports.getManagerByOrganization = async (req, res) => {
  try {
    let usersQuery = {};

    if (req.orgScope !== "ALL") {
      usersQuery.organizationId = { $in: req.orgScope };
    }

    const users = await User.find(usersQuery)
      .select("-passwordHash")
      .populate("organizationId", "name email phone")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      message: "Users fetched successfully",
      total: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server error",
    });
  }
};
