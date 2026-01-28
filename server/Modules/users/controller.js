const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken")
const User = require('../users/model');
const Validator = require('../../helpers/validators')
const Organization = require("../organizations/model")
const mongoose = require('mongoose');
const paginate = require("../../helpers/limitoffset");

const JWT_SECRET = process.env.JWT_SECRET;
console.log("LOGIN SECRET:", JWT_SECRET);

/**
 * =========================
 * VALIDATION FUNCTIONS
 * =========================
 */

const validateLoginData = async (data) => {
    const rules = {
        email: "required|email",
        password: "required"
    }
    const validator = new Validator(data, rules)
    await validator.validate()
}

const validateOrganizationWithAdminData = async (data) => {
    const rules = {
        name: "required|string",
        organizationType: "required|in:logistics,transport,school,taxi,fleet",
        email: "required|email",
        phone: "required|string",
        firstName: "required|string",
        lastName: "required|string",
        password: "required|string",
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
    const allowedFields = ["firstName", "lastName", "email", "mobile", "status"];
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

/**
 * =========================
 * LOGIN
 * =========================
 */

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
        console.error("Login Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Server error",
        });
    }
};

/**
 * =========================
 * CREATE ORGANIZATION WITH ADMIN (NEW SINGLE ENDPOINT)
 * =========================
 */

exports.createOrganizationWithAdmin = async (req, res) => {
    try {
        // Parse nested objects from form-data
        ["address", "geo", "settings"].forEach((field) => {
            if (typeof req.body[field] === "string") {
                req.body[field] = JSON.parse(req.body[field]);
            }
        });

        await validateOrganizationWithAdminData(req.body);

        const {
            name,
            organizationType,
            email,
            phone,
            firstName,
            lastName,
            password,
            address,
            geo,
            settings,
            parentOrganizationId
        } = req.body;

        // Check duplicate organization
        const existingOrg = await Organization.findOne({
            $or: [{ email: email.toLowerCase() }, { phone: phone.trim() }]
        });
        if (existingOrg) {
            return res.status(409).json({
                status: false,
                message: "Organization with this email or phone already exists"
            });
        }

        // Check duplicate user
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { mobile: phone.trim() }]
        });
        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: "Admin user with this email or mobile already exists"
            });
        }

        // Validate parent org if provided
        let parentOrg = null;
        let path = `/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        
        if (parentOrganizationId) {
            if (!mongoose.isValidObjectId(parentOrganizationId)) {
                return res.status(400).json({
                    status: false,
                    message: "Invalid parent organization ID"
                });
            }
            parentOrg = await Organization.findById(parentOrganizationId);
            if (!parentOrg) {
                return res.status(404).json({
                    status: false,
                    message: "Parent organization not found"
                });
            }
            path = `${parentOrg.path}/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        }

        // Get logo from file upload
        let logo = null;
        if (req.file) {
            logo = `/uploads/logos/${req.file.filename}`;
        }

        // Create organization
        const organization = await Organization.create({
            name: name.trim(),
            organizationType,
            email: email.toLowerCase().trim(),
            phone: phone.trim(),
            logo: logo || null,
            address: address || {},
            geo: geo || { timezone: "Asia/Kolkata" },
            settings: settings || {},
            parentOrganizationId: parentOrg ? parentOrg._id : null,
            path: path,
            status: "active",
            createdBy: req.user._id
        });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin user
        const adminUser = await User.create({
            organizationId: organization._id,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            mobile: phone.trim(),
            passwordHash: hashedPassword,
            role: "admin",
            status: "active"
        });

        // Link admin to organization
        organization.adminUser = adminUser._id;
        await organization.save();

        return res.status(201).json({
            status: true,
            message: "Organization and Admin created successfully",
            data: {
                organization: {
                    _id: organization._id,
                    name: organization.name,
                    email: organization.email,
                    phone: organization.phone,
                    adminUser: adminUser._id
                },
                admin: {
                    _id: adminUser._id,
                    firstName: adminUser.firstName,
                    lastName: adminUser.lastName,
                    email: adminUser.email,
                    mobile: adminUser.mobile,
                    role: adminUser.role
                }
            }
        });

    } catch (error) {
        console.error("Create Organization With Admin Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
        });
    }
};

/**
 * =========================
 * CREATE ORGANIZATION ADMIN (OLD WAY - STILL WORKS)
 * =========================
 */

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

        if (!mongoose.isValidObjectId(organizationId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid organization ID"
            });
        }

        const org = await Organization.findById(organizationId)
        if (!org) {
            return res.status(404).json({
                status: false,
                message: "Organization not found"
            })
        }
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

        const admin = await User.create({
            organizationId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            passwordHash: password,
            role: "admin",
            status: "active"
        })

        // Update organization's adminUser field
        org.adminUser = admin._id;
        await org.save();

        return res.status(201).json({
            status: true,
            message: "Organization Admin Created",
            data: {
                _id: admin._id,
                firstName: admin.firstName,
                lastName: admin.lastName,
                email: admin.email,
                mobile: admin.mobile,
                role: admin.role
            }
        });

    } catch (error) {
        console.error("Create Organization Admin Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
        });
    }
};

/**
 * =========================
 * GET ALL ADMINS
 * =========================
 */

exports.getAllAdmins = async (req, res) => {
    try {
        const { page, limit, search } = req.query;

        const filter = { role: "admin" };

        const result = await paginate(
            User,
            filter,
            page,
            limit,
            ["organizationId"],
            ["firstName", "lastName", "email", "mobile"],
            search
        );

        return res.status(200).json(result);

    } catch (error) {
        console.error("Get All Admins Error:", error);
        return res.status(500).json({
            status: false,
            message: error.message || "Server error"
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
/**
 * =========================
 * CREATE MANAGER
 * =========================
 */

exports.createManager = async (req, res) => {
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

        if (!mongoose.isValidObjectId(organizationId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid organization ID"
            });
        }

        const org = await Organization.findById(organizationId)
        if (!org) {
            return res.status(404).json({
                status: false,
                message: "Organization not found"
            })
        }

        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { mobile: mobile.trim() }]
        });

        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: "User with this email or mobile already exists"
            })
        }

        const password = await bcrypt.hash(passwordHash, 10);

        const manager = await User.create({
            organizationId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            passwordHash: password,
            role: "manager",
            status: "active"
        });

        await manager.populate('organizationId');

        return res.status(201).json({
            status: true,
            message: "Manager created successfully",
            data: {
                _id: manager._id,
                firstName: manager.firstName,
                lastName: manager.lastName,
                email: manager.email,
                mobile: manager.mobile,
                organizationId: manager.organizationId,
                role: manager.role
            }
        });

    } catch (error) {
        console.error("Create Manager Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error",
        });
    }
};

/**
 * =========================
 * CREATE DRIVER USER
 * =========================
 */

exports.createDriverUser = async (req, res) => {
    try {
        const { firstName, lastName, email, mobile, password, organizationId, driverId } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !email || !mobile || !password || !organizationId) {
            return res.status(400).json({
                status: false,
                message: "firstName, lastName, email, mobile, password, and organizationId are required"
            });
        }

        // Verify organizationId belongs to user (if not superadmin)
        if (req.user.role !== "superadmin" && organizationId !== req.user.organizationId.toString()) {
            return res.status(403).json({
                status: false,
                message: "Forbidden: Cannot create users for other organizations"
            });
        }

        if (!mongoose.isValidObjectId(organizationId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid organization ID"
            });
        }

        // Verify organization exists
        const org = await Organization.findById(organizationId);
        if (!org) {
            return res.status(404).json({
                status: false,
                message: "Organization not found"
            });
        }

        // Check for duplicate email or mobile
        const existingUser = await User.findOne({
            $or: [{ email: email.toLowerCase() }, { mobile: mobile.trim() }]
        });

        if (existingUser) {
            return res.status(409).json({
                status: false,
                message: "User with this email or mobile already exists"
            });
        }

        // Validate driverId if provided
        if (driverId && !mongoose.isValidObjectId(driverId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid driver ID"
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create driver user
        const driverUser = await User.create({
            organizationId,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.toLowerCase().trim(),
            mobile: mobile.trim(),
            passwordHash: hashedPassword,
            driverId: driverId || null,
            role: "driver",
            status: "active"
        });

        await driverUser.populate(['organizationId', 'driverId']);

        return res.status(201).json({
            status: true,
            message: "Driver user created successfully",
            data: {
                _id: driverUser._id,
                firstName: driverUser.firstName,
                lastName: driverUser.lastName,
                email: driverUser.email,
                mobile: driverUser.mobile,
                organizationId: driverUser.organizationId,
                driverId: driverUser.driverId,
                role: driverUser.role,
                status: driverUser.status
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

/**
 * =========================
 * UPDATE USER
 * =========================
 */

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid user ID"
            });
        }

        await validateUpdateUserData(req.body);

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        // Check for duplicate email or mobile if updating them
        if (req.body.email || req.body.mobile) {
            const query = {
                _id: { $ne: user._id }
            };

            const orConditions = [];
            if (req.body.email) orConditions.push({ email: req.body.email.toLowerCase().trim() });
            if (req.body.mobile) orConditions.push({ mobile: req.body.mobile.trim() });

            if (orConditions.length > 0) {
                query.$or = orConditions;
                const duplicate = await User.findOne(query);
                if (duplicate) {
                    return res.status(409).json({
                        status: false,
                        message: "User with this email or mobile already exists"
                    });
                }
            }
        }

        // Trim and normalize string fields
        if (req.body.firstName) req.body.firstName = req.body.firstName.trim();
        if (req.body.lastName) req.body.lastName = req.body.lastName.trim();
        if (req.body.email) req.body.email = req.body.email.toLowerCase().trim();
        if (req.body.mobile) req.body.mobile = req.body.mobile.trim();

        // Update user
        Object.assign(user, req.body);
        user.updatedAt = new Date();
        await user.save();

        await user.populate('organizationId');

        return res.status(200).json({
            status: true,
            message: "User updated successfully",
            data: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                mobile: user.mobile,
                organizationId: user.organizationId,
                role: user.role,
                status: user.status
            }
        });
    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error"
        });
    }
};

/**
 * =========================
 * DELETE USER
 * =========================
 */

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                status: false,
                message: "Invalid user ID"
            });
        }

        const user = await User.findByIdAndDelete(id);
        if (!user) {
            return res.status(404).json({
                status: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            status: true,
            message: "User deleted successfully"
        });
    } catch (error) {
        console.error("Delete User Error:", error);
        return res.status(error.status || 500).json({
            status: false,
            message: error.message || "Internal server error"
        });
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
