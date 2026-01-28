const Organization = require("./model");
const User = require("../users/model");
const Validator = require("../../helpers/validators");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const validateOrganizationData = async (data) => {
  const rules = {
    name: "required|string",
    organizationType: "required|in:logistics,transport,school,taxi,fleet",
    email: "required|email",
    phone: "required|string",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateAddressData = (address) => {
  if (!address) return true;
  if (typeof address !== "object") {
    throw {
      status: 400,
      message:
        "Address must be an object with addressLine, city, state, country, pincode",
    };
  }
  return true;
};

const validateGeoData = (geo) => {
  if (!geo) return true;
  if (typeof geo !== "object") {
    throw {
      status: 400,
      message: "Geo must be an object with lat, lng, timezone",
    };
  }
  if (geo.lat && (geo.lat < -90 || geo.lat > 90)) {
    throw {
      status: 400,
      message: "Latitude must be between -90 and 90",
    };
  }
  if (geo.lng && (geo.lng < -180 || geo.lng > 180)) {
    throw {
      status: 400,
      message: "Longitude must be between -180 and 180",
    };
  }
  return true;
};

const validateSettingsData = (settings) => {
  if (!settings) return true;
  if (typeof settings !== "object") {
    throw {
      status: 400,
      message: "Settings must be an object",
    };
  }
  if (
    settings.speedLimit &&
    (settings.speedLimit < 0 || settings.speedLimit > 300)
  ) {
    throw {
      status: 400,
      message: "Speed limit must be between 0 and 300 km/h",
    };
  }
  if (
    settings.lowFuelThreshold &&
    (settings.lowFuelThreshold < 0 || settings.lowFuelThreshold > 100)
  ) {
    throw {
      status: 400,
      message: "Low fuel threshold must be between 0 and 100 %",
    };
  }
  return true;
};

const validateSubOrgData = async (data) => {
  const rules = {
    name: "required|string",
    organizationType: "required|in:logistics,transport,school,taxi,fleet",
    email: "required|email",
    phone: "required|string",
    parentOrganizationId: "required",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateManagerData = async (data) => {
  const rules = {
    firstName: "required|string",
    lastName: "required|string",
    email: "required|email",
    mobile: "required|string",
    password: "required",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

exports.createOrganization = async (req, res) => {
  try {
    // Parse nested objects from form-data
    if (typeof req.body.address === "string") {
      req.body.address = JSON.parse(req.body.address);
    }

    if (typeof req.body.geo === "string") {
      req.body.geo = JSON.parse(req.body.geo);
    }

    if (typeof req.body.settings === "string") {
      req.body.settings = JSON.parse(req.body.settings);
    }

    await validateOrganizationData(req.body);
    validateAddressData(req.body.address);
    validateGeoData(req.body.geo);
    validateSettingsData(req.body.settings);

    const { name, organizationType, email, phone, address, geo, settings } =
      req.body;

    // Get logo from file upload or body
    let logo = null;
    if (req.file) {
      logo = `/uploads/logos/${req.file.filename}`;
    } else if (req.body.logo) {
      logo = req.body.logo;
    }

    const existingOrg = await Organization.findOne({
      $or: [{ email }, { phone }],
    });
    if (existingOrg) {
      return res.status(409).json({
        status: false,
        message: "Organization with this email or phone already exists",
      });
    }

    // Generate path (for hierarchical organization)
    const path = `/${name.toLowerCase().replace(/\s+/g, "-")}`;

    const organization = await Organization.create({
      name,
      organizationType,
      email: email.toLowerCase(),
      phone: phone.trim(),
      logo: logo,
      address: address || {},
      geo: geo || { timezone: "Asia/Kolkata" },
      settings: settings || {},
      parentOrganizationId: null,
      path,
      adminUser: null,
      createdBy: req.user._id,
      status: "active",
    });

    return res.status(201).json({
      status: true,
      message: "Organization Created Successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Create Organization Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.getAll = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "superadmin") {
      // admins/managers can only see their own organization
      if (req.user.organizationId) {
        query._id = req.user.organizationId;
      } else {
        // Should not happen for valid admin/manager tokens, but handle gracefully
        return res.status(200).json({
          status: true,
          message: "No organization assigned",
          data: [],
        });
      }
    }

    const organizations = await Organization.find(query);
    return res.status(200).json({
      status: true,
      message: "Organizations Fetched Successfully",
      data: organizations,
    });
  } catch (error) {
    console.error("Get All Organizations Error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);
    if (!organization)
      return res
        .status(404)
        .json({ status: false, message: "Organization not found" });
    return res.status(200).json({
      status: true,
      message: "Organization Fetched Successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Get Organization By ID Error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const organization = await Organization.findById(req.params.id);

    if (!organization) {
      return res.status(404).json({
        status: false,
        message: "Organization not found",
      });
    }

    // Validate fields if provided
    const { organizationType, email, phone, address, geo, settings } = req.body;

    if (
      organizationType &&
      !["logistics", "transport", "school", "taxi", "fleet"].includes(
        organizationType,
      )
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid organization type",
      });
    }

    // Check for duplicate email if updating
    if (email && email !== organization.email) {
      const exists = await Organization.findOne({ email: email.toLowerCase() });
      if (exists) {
        return res.status(409).json({
          status: false,
          message: "Email already in use",
        });
      }
    }

    // Check for duplicate phone if updating
    if (phone && phone !== organization.phone) {
      const exists = await Organization.findOne({ phone: phone.trim() });
      if (exists) {
        return res.status(409).json({
          status: false,
          message: "Phone already in use",
        });
      }
    }

    validateAddressData(address);
    validateGeoData(geo);
    validateSettingsData(settings);

    // Handle logo upload
    if (req.file) {
      req.body.logo = `/uploads/logos/${req.file.filename}`;
    }

    // Update only provided fields
    const allowedFields = [
      "name",
      "organizationType",
      "email",
      "phone",
      "logo",
      "address",
      "geo",
      "settings",
      "status",
    ];

    Object.keys(req.body).forEach((key) => {
      if (allowedFields.includes(key)) {
        if (key === "email") {
          organization[key] = req.body[key].toLowerCase();
        } else if (key === "phone") {
          organization[key] = req.body[key].trim();
        } else {
          organization[key] = req.body[key];
        }
      }
    });

    organization.updatedAt = new Date();
    await organization.save();

    return res.status(200).json({
      status: true,
      message: "Organization Updated Successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Update Organization Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const organization = await Organization.findByIdAndDelete(req.params.id);
    if (!organization)
      return res
        .status(404)
        .json({ status: false, message: "Organization not found" });
    return res
      .status(200)
      .json({ status: true, message: "Organization Deleted Successfully" });
  } catch (error) {
    console.error("Delete Organization Error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

// exports.createSubOrganization = async (req, res) => {
//   try {
//     await validateSubOrgData(req.body);
//     validateAddressData(req.body.address);
//     validateGeoData(req.body.geo);
//     validateSettingsData(req.body.settings);

//     const {
//       name,
//       organizationType,
//       email,
//       phone,
//       address,
//       geo,
//       settings,
//       parentOrganizationId,
//     } = req.body;

//     // Get logo from file upload or body
//     let logo = null;
//     if (req.file) {
//       logo = `/uploads/logos/${req.file.filename}`;
//     } else if (req.body.logo) {
//       logo = req.body.logo;
//     }

//     // Verify parent organization exists
//     const parentOrg = await Organization.findById(parentOrganizationId);
//     if (!parentOrg) {
//       return res.status(404).json({
//         status: false,
//         message: "Parent organization not found",
//       });
//     }

//     const existingOrg = await Organization.findOne({
//       $or: [{ email }, { phone }],
//     });
//     if (existingOrg) {
//       return res.status(409).json({
//         status: false,
//         message: "Organization with this email or phone already exists",
//       });
//     }

//     // Generate hierarchical path
//     const path = `${parentOrg.path || ""}/${name.toLowerCase().replace(/\s+/g, "-")}`;

//     const subOrganization = await Organization.create({
//       name,
//       organizationType,
//       email: email.toLowerCase(),
//       phone: phone.trim(),
//       logo: logo,
//       address: address || {},
//       geo: geo || { timezone: "Asia/Kolkata" },
//       settings: settings || {},
//       parentOrganizationId,
//       path,
//       adminUser: null,
//       createdBy: req.user._id,
//       status: "active",
//     });

//     return res.status(201).json({
//       status: true,
//       message: "Sub-organization created successfully",
//       data: subOrganization,
//     });
//   } catch (error) {
//     console.error("Create Sub-Organization Error:", error);
//     return res.status(error.status || 500).json({
//       status: false,
//       message: error.message || "Internal server error",
//     });
//   }
// };

exports.createSubOrgWithManager = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { organizationData, managerData, parentOrganizationId } = req.body;

    if (!organizationData || !managerData || !parentOrganizationId) {
      return res.status(400).json({
        status: false,
        message:
          "organizationData, managerData and parentOrganizationId are required",
      });
    }

    // validations
    await validateOrganizationData(organizationData);
    validateAddressData(organizationData.address);
    validateGeoData(organizationData.geo);
    validateSettingsData(organizationData.settings);
    await validateManagerData(managerData);

    const parentOrg = await Organization.findById(parentOrganizationId);
    if (!parentOrg) {
      return res.status(404).json({
        status: false,
        message: "Parent organization not found",
      });
    }

    // duplicate org
    const existingOrg = await Organization.findOne({
      $or: [
        { email: organizationData.email.toLowerCase() },
        { phone: organizationData.phone.trim() },
      ],
    });

    if (existingOrg) {
      return res.status(409).json({
        status: false,
        message: "Organization already exists",
      });
    }

    // duplicate user
    const existingUser = await User.findOne({
      $or: [
        { email: managerData.email.toLowerCase() },
        { mobile: managerData.mobile.trim() },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        status: false,
        message: "User already exists",
      });
    }

    const slug = organizationData.name.toLowerCase().replace(/\s+/g, "-");
    const path = `${parentOrg.path}/${slug}-${Date.now()}`;

    const logo = req.file
      ? `/uploads/logos/${req.file.filename}`
      : organizationData.logo || null;

    // ✅ create sub org
    const [subOrganization] = await Organization.create(
      [
        {
          name: organizationData.name,
          organizationType: organizationData.organizationType,
          email: organizationData.email.toLowerCase(),
          phone: organizationData.phone.trim(),
          logo,
          address: organizationData.address,
          geo: organizationData.geo,
          settings: organizationData.settings,
          parentOrganizationId,
          path,
          adminUser: null,
          createdBy: req.user._id,
          status: "active",
        },
      ],
      { session },
    );

    // hash password
    const hashedPassword = await bcrypt.hash(managerData.password, 10);

    // ✅ create manager INSIDE sub org
    const [manager] = await User.create(
      [
        {
          organizationId: subOrganization._id, // 🔥 MOST IMPORTANT FIX
          firstName: managerData.firstName,
          lastName: managerData.lastName,
          email: managerData.email.toLowerCase(),
          mobile: managerData.mobile.trim(),
          passwordHash: hashedPassword,
          role: "manager",
          status: "active",
        },
      ],
      { session },
    );

    // attach admin
    subOrganization.adminUser = manager._id;
    await subOrganization.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Sub-organization and manager created successfully",
      data: {
        organization: subOrganization,
        manager: {
          _id: manager._id,
          firstName: manager.firstName,
          lastName: manager.lastName,
          email: manager.email,
          mobile: manager.mobile,
          role: manager.role,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error("Create Sub-Org Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

exports.getSubOrganizations = async (req, res) => {
  try {
    const { parentId } = req.query;

    if (!parentId) {
      return res.status(400).json({
        status: false,
        message: "parentId query parameter is required",
      });
    }

    const subOrgs = await Organization.find({ parentOrganizationId: parentId })
      .populate("parentOrganizationId", "name email")
      .populate("createdBy", "firstName lastName email");

    return res.status(200).json({
      status: true,
      message: "Sub-organizations fetched successfully",
      totalSubOrgs: subOrgs.length,
      data: subOrgs,
    });
  } catch (error) {
    console.error("Get Sub-Organizations Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
