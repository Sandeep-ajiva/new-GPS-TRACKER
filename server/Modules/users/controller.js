const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../users/model");
const Organization = require("../organizations/model");

const Validator = require("../../helpers/validators");
const paginate = require("../../helpers/limitoffset");

const JWT_SECRET = process.env.JWT_SECRET;

/* ======================================================
   VALIDATIONS
====================================================== */

const validateLoginData = async (data) => {
  const rules = {
    email: "required|email",
    password: "required",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateUpdateUserData = async (data) => {
  const rules = {
    firstName: "string",
    lastName: "string",
    email: "email",
    mobile: "string",
    status: "in:active,inactive",
  };

  const allowedFields = ["firstName", "lastName", "email", "mobile", "status"];

  Object.keys(data).forEach((key) => {
    if (!allowedFields.includes(key)) {
      throw { status: 400, message: `Invalid field: ${key}` };
    }
    if (data[key] === "") {
      throw { status: 400, message: `${key} cannot be empty` };
    }
  });

  const validator = new Validator(data, rules);
  await validator.validate();
};

/* ======================================================
   AUTH
====================================================== */

exports.login = async (req, res) => {
  try {
    await validateLoginData(req.body);

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }

    if (user.status !== "active") {
      return res
        .status(403)
        .json({ status: false, message: "User account is inactive" });
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
    console.error("Login Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Server error",
    });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-passwordHash")
      .populate("organizationId", "name email phone")
      .populate("assignedVehicleId", "vehicleNumber vehicleType model status runningStatus deviceId");
    if (!user)
      return res.status(404).json({ status: false, message: "User not found" });
    return res.json({ status: true, data: user });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

/* ======================================================
   READ USERS
====================================================== */

exports.getAll = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === "superadmin") {
      if (req.query.organizationId) {
        query.organizationId = req.query.organizationId;
      }
    } else {
      if (!req.user.organizationId) {
        return res
          .status(403)
          .json({ status: false, message: "Access denied" });
      }
      query.organizationId = req.user.organizationId;
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

exports.getManagerByOrganization = async (req, res) => {
  try {
    let usersQuery = {};

    if (req.orgScope !== "ALL") {
      const scopedOrgIds = req.orgScope.map((id) => id.toString());
      const parentOrgId = req.user.organizationId
        ? req.user.organizationId.toString()
        : null;
      const subOrgIdsOnly = parentOrgId
        ? scopedOrgIds.filter((id) => id !== parentOrgId)
        : scopedOrgIds;

      usersQuery.organizationId = { $in: subOrgIdsOnly };
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

/* ======================================================
   CREATE USER (ADMIN / SUPERADMIN)
====================================================== */

exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, mobile, password, role, organizationId } =
      req.body;
    const allowedRoles = ["admin", "driver"];

    if (!firstName || !email || !mobile || !password || !role) {
      return res.status(400).json({
        status: false,
        message: "Required fields missing",
      });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        status: false,
        message: "Invalid role. Allowed roles: admin, driver",
      });
    }

    const finalOrgId =
      req.user.role === "superadmin" ? organizationId : req.user.organizationId;

    if (!finalOrgId) {
      return res.status(400).json({
        status: false,
        message: "Organization is required",
      });
    }

    const org = await Organization.findById(finalOrgId);
    if (!org) {
      return res
        .status(404)
        .json({ status: false, message: "Organization not found" });
    }

    const exists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile: mobile.trim() }],
    });
    if (exists) {
      return res.status(409).json({
        status: false,
        message: "User with this email or mobile already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      organizationId: finalOrgId,
      firstName: firstName.trim(),
      lastName: lastName?.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile.trim(),
      passwordHash,
      role,
      status: "active",
    });

    return res.status(201).json({
      status: true,
      message: "User created successfully",
      data: user,
    });
  } catch (error) {
    console.error("Create User Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* ======================================================
   UPDATE USER
====================================================== */

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID" });
    }

    await validateUpdateUserData(req.body);

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "User not found" });
    }

    if (req.body.email || req.body.mobile) {
      const duplicate = await User.findOne({
        _id: { $ne: user._id },
        $or: [
          req.body.email && { email: req.body.email.toLowerCase() },
          req.body.mobile && { mobile: req.body.mobile.trim() },
        ].filter(Boolean),
      });

      if (duplicate) {
        return res.status(409).json({
          status: false,
          message: "User with this email or mobile already exists",
        });
      }
    }

    Object.assign(user, req.body);
    await user.save();

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    console.error("Update User Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* ======================================================
   DELETE USER
====================================================== */

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res
        .status(404)
        .json({ status: false, message: "User not found" });
    }

    if (req.user.role !== "superadmin") {
      if (!req.orgScope) {
        return res.status(400).json({
          status: false,
          message: "Organization scope missing",
        });
      }

      if (user.role === "superadmin") {
        return res.status(403).json({
          status: false,
          message: "Forbidden: Cannot delete superadmin user",
        });
      }

      const userOrgId = user.organizationId ? user.organizationId.toString() : null;
      const canDeleteInScope =
        req.orgScope === "ALL" ||
        (Array.isArray(req.orgScope) &&
          userOrgId &&
          req.orgScope.some((orgId) => orgId.toString() === userOrgId));

      if (!canDeleteInScope) {
        return res.status(403).json({
          status: false,
          message: "Forbidden: Cannot delete user from another organization",
        });
      }
    }

    await user.deleteOne();

    return res.status(200).json({
      status: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete User Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};
