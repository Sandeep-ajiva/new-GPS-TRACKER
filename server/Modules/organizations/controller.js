const Organization = require("./model");
const User = require("../users/model");
const Validator = require("../../helpers/validators");
const paginate = require("../../helpers/limitoffset");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

/* ======================================================
   COMMON HELPERS
====================================================== */

const parseJsonFields = (body, fields = []) => {
  fields.forEach((field) => {
    if (typeof body[field] === "string" && body[field].trim().startsWith("{")) {
      try {
        body[field] = JSON.parse(body[field]);
      } catch (e) {
        console.warn(`Failed to parse field ${field}:`, e.message);
      }
    }
  });
};

/* ======================================================
   VALIDATIONS
====================================================== */

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

const validateOrganizationWithAdminData = async (data) => {
  const rules = {
    name: "required|string",
    organizationType: "required|in:logistics,transport,school,taxi,fleet",
    email: "required|email",
    phone: "required|string",
    firstName: "required|string",
    lastName: "required|string",
    password: "required|string",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
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
    password: "required",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

const validateSubAdminData = async (data) => {
  const rules = {
    organizationId: "required",
    firstName: "required|string",
    lastName: "required|string",
    email: "required|email",
    mobile: "required|string",
    password: "required|string",
  };
  const validator = new Validator(data, rules);
  await validator.validate();
};

const resolveParentOrganizationId = (req, requestedParentOrganizationId) => {
  if (req.user?.role === "admin") {
    return req.user.organizationId || null;
  }
  return requestedParentOrganizationId || null;
};

const validateAddressData = (address) => {
  if (!address) return true;
  if (typeof address !== "object" && typeof address !== "string") {
    throw {
      status: 400,
      message:
        "Address must be an object or a string",
    };
  }
};

const normalizeAddress = (address) => {
  if (!address) return { addressLine: "", city: "", state: "", country: "", pincode: "" };
  if (typeof address === "string") {
    return { addressLine: address, city: "", state: "", country: "", pincode: "" };
  }
  return {
    addressLine: address.addressLine || "",
    city: address.city || "",
    state: address.state || "",
    country: address.country || "",
    pincode: address.pincode || "",
  };
};

const validateGeoData = (geo) => {
  if (!geo) return true;
  if (typeof geo !== "object") {
    throw { status: 400, message: "Geo must be an object" };
  }
  if (geo.lat && (geo.lat < -90 || geo.lat > 90)) {
    throw { status: 400, message: "Latitude must be between -90 and 90" };
  }
  if (geo.lng && (geo.lng < -180 || geo.lng > 180)) {
    throw { status: 400, message: "Longitude must be between -180 and 180" };
  }
};

const validateSettingsData = (settings) => {
  if (!settings) return true;
  if (typeof settings !== "object") {
    throw { status: 400, message: "Settings must be an object" };
  }
};

/* ======================================================
   CREATE ORGANIZATION + ADMIN
====================================================== */

exports.createOrganizationWithAdmin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    parseJsonFields(req.body, ["address", "geo", "settings"]);

    await validateOrganizationWithAdminData(req.body);
    validateAddressData(req.body.address);
    validateGeoData(req.body.geo);
    validateSettingsData(req.body.settings);

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
    } = req.body;

    /* 🔒 GLOBAL UNIQUE OR SCOPED UNIQUE — choose strategy */

    const orgExists = await Organization.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: phone.trim() }],
    }).session(session);

    if (orgExists) {
      throw {
        status: 409,
        message: "Organization with this email or phone already exists",
      };
    }

    const userExists = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { mobile: phone.trim() }],
    }).session(session);

    if (userExists) {
      throw {
        status: 409,
        message: "Admin user with this email or mobile already exists",
      };
    }

    /* 🧠 SLUG SAFE */

    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    let slug = baseSlug;
    let slugExists = await Organization.findOne({ path: `/${slug}` });

    if (slugExists) {
      slug = `${baseSlug}-${Date.now()}`;
    }

    const path = `/${slug}`;

    const logo = req.file ? `/uploads/logos/${req.file.filename}` : null;

    /* 🏢 CREATE ORG */

    const [organization] = await Organization.create(
      [
        {
          name: name.trim(),
          organizationType,
          email: email.toLowerCase().trim(),
          phone: phone.trim(),
          logo,
          address: normalizeAddress(address),
          geo: geo || { timezone: "Asia/Kolkata" },
          settings: settings || {},
          parentOrganizationId: null,
          path,
          status: "active",
          createdBy: req.user._id,
        },
      ],
      { session }
    );

    /* 👤 CREATE ADMIN */

    const passwordHash = await bcrypt.hash(password, 10);

    const [adminUser] = await User.create(
      [
        {
          organizationId: organization._id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          mobile: phone.trim(),
          passwordHash,
          role: "admin",
          status: "active",
        },
      ],
      { session }
    );

    organization.adminUser = adminUser._id;
    await organization.save({ session });

    await session.commitTransaction();

    return res.status(201).json({
      status: true,
      message: "Organization and Admin created successfully",
      data: { organization, admin: adminUser },
    });
  } catch (error) {
    await session.abortTransaction();

    console.error("Create Organization With Admin Error:", error);

    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  } finally {
    session.endSession();
  }
};
/* ======================================================
   CREATE ORGANIZATION ONLY
====================================================== */

exports.createOrganization = async (req, res) => {
  try {
    parseJsonFields(req.body, ["address", "geo", "settings"]);

    await validateOrganizationData(req.body);
    validateAddressData(req.body.address);
    validateGeoData(req.body.geo);
    validateSettingsData(req.body.settings);

    const { name, organizationType, email, phone, address, geo, settings } =
      req.body;

    const exists = await Organization.findOne({
      $or: [{ email }, { phone }],
    });
    if (exists) {
      return res.status(409).json({
        status: false,
        message: "Organization with this email or phone already exists",
      });
    }

    const logo = req.file
      ? `/uploads/logos/${req.file.filename}`
      : req.body.logo || null;

    const path = `/${name.toLowerCase().replace(/\s+/g, "-")}`;

    const organization = await Organization.create({
      name,
      organizationType,
      email: email.toLowerCase(),
      phone: phone.trim(),
      logo,
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

/* ======================================================
   READ
====================================================== */

exports.getAll = async (req, res) => {
  try {
    const query =
      req.user.role === "superadmin" || req.orgScope === "ALL"
        ? {}
        : { _id: { $in: req.orgScope } };

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
    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { _id: { $in: req.orgScope } };
    const organization = await Organization.findOne({ _id: req.params.id, ...orgFilter });

    if (!organization) {
      return res
        .status(404)
        .json({ status: false, message: "Organization not found or access denied" });
    }
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

/* ======================================================
   UPDATE
====================================================== */

exports.update = async (req, res) => {
  try {
    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { _id: { $in: req.orgScope } };
    const organization = await Organization.findOne({ _id: req.params.id, ...orgFilter });

    if (!organization) {
      return res
        .status(404)
        .json({ status: false, message: "Organization not found or access denied" });
    }

    if (req.file) {
      req.body.logo = `/uploads/logos/${req.file.filename}`;
    }

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

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        organization[field] =
          field === "email"
            ? req.body[field].toLowerCase()
            : field === "phone"
              ? req.body[field].trim()
              : req.body[field];
      }
    });

    await organization.save();

    return res.status(200).json({
      status: true,
      message: "Organization Updated Successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Update Organization Error:", error);
    return res.status(500).json({ status: false, message: error.message });
  }
};

/* ======================================================
   DELETE
====================================================== */

exports.delete = async (req, res) => {
  try {
    const orgFilter =
      req.orgScope === "ALL"
        ? {}
        : { _id: { $in: req.orgScope } };

    const organization = await Organization.findOne({
      _id: req.params.id,
      ...orgFilter,
    });

    if (!organization) {
      return res.status(404).json({
        status: false,
        message: "Organization not found or access denied",
      });
    }

    if (!organization.parentOrganizationId) {
  return res.status(400).json({
    status: false,
    message: "Root organization cannot be deleted",
  });
}
    /* 🧨 CASCADE DELETE */

    await Promise.all([
      User.deleteMany({ organizationId: req.params.id }),
      Vehicle.deleteMany({ organizationId: req.params.id }),
      Device.deleteMany({ organizationId: req.params.id }),
      Driver.deleteMany({ organizationId: req.params.id }),
      VehicleMapping.deleteMany({ organizationId: req.params.id }),
    ]);

    await Organization.deleteOne({ _id: req.params.id });

    return res.status(200).json({
      status: true,
      message: "Organization Deleted Successfully",
    });
  } catch (error) {
    console.error("Delete Organization Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

/* ======================================================
   CREATE SUB-ORG + ADMIN (TRANSACTION)
====================================================== */
exports.createSubOrganizationWithManager = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (typeof req.body.organizationData === "string") {
      try {
        req.body.organizationData = JSON.parse(req.body.organizationData);
      } catch (_) { }
    }
    if (typeof req.body.managerData === "string") {
      try {
        req.body.managerData = JSON.parse(req.body.managerData);
      } catch (_) { }
    }

    const organizationData = req.body.organizationData || {};
    const managerData = req.body.managerData || {};

    const parentOrganizationId = resolveParentOrganizationId(
      req,
      req.body.parentOrganizationId || organizationData.parentOrganizationId
    );

    await validateOrganizationData(organizationData);
    await validateManagerData(managerData);
    validateAddressData(organizationData.address);
    validateGeoData(organizationData.geo);
    validateSettingsData(organizationData.settings);

    if (!parentOrganizationId) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        status: false,
        message: "parentOrganizationId is required",
      });
    }

    // 🔐 ensure admin has access to parent org
    if (
      req.orgScope !== "ALL" &&
      !req.orgScope.some(
        (id) => id.toString() === parentOrganizationId.toString()
      )
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: false,
        message: "You are not allowed to create sub-organization under this organization",
      });
    }

    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { _id: { $in: req.orgScope } };
    const parentOrg = await Organization.findOne({
      _id: parentOrganizationId,
      ...orgFilter
    }).session(session);
    if (!parentOrg) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: false,
        message: "Parent organization not found",
      });
    }

    // 🔒 duplicate organization check (SAME as root org)
    const orgExists = await Organization.findOne({
      $or: [
        { email: organizationData.email.toLowerCase() },
        { phone: organizationData.phone.trim() },
      ],
    }).session(session);

    if (orgExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        status: false,
        message: "Organization with this email or phone already exists",
      });
    }

    const adminEmail = (managerData.email || organizationData.email || "")
      .toLowerCase()
      .trim();
    const adminMobile = (managerData.mobile || organizationData.phone || "")
      .trim();

    const userExists = await User.findOne({
      $or: [{ email: adminEmail }, { mobile: adminMobile }],
    }).session(session);

    if (userExists) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        status: false,
        message: "User with this email or mobile already exists",
      });
    }

    // 🧠 slug + path (same logic everywhere)
    const slug = organizationData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-");

    const path = `${parentOrg.path}/${slug}`;

    const logo = req.file
      ? `/uploads/logos/${req.file.filename}`
      : null;

    // 1️⃣ create sub-organization
    const [subOrganization] = await Organization.create(
      [
        {
          name: organizationData.name.trim(),
          organizationType: organizationData.organizationType,
          email: organizationData.email.toLowerCase().trim(),
          phone: organizationData.phone.trim(),
          logo,
          address: organizationData.address || {},
          geo: organizationData.geo || { timezone: "Asia/Kolkata" },
          settings: organizationData.settings || {},
          parentOrganizationId,
          path,
          status: "active",
          createdBy: req.user._id,
          adminUser: null,
        },
      ],
      { session },
    );

    // 2️⃣ create manager
    // 🔥 email & phone SAME as organization
    const passwordHash = await bcrypt.hash(managerData.password, 10);

    const [newOrgAdmin] = await User.create(
      [
        {
          organizationId: subOrganization._id,
          firstName: managerData.firstName.trim(),
          lastName: managerData.lastName.trim(),
          email: adminEmail,
          mobile: adminMobile,
          passwordHash,
          role: "admin",
          status: "active",
          createdBy: req.user._id,
        },
      ],
      { session },
    );

    subOrganization.adminUser = newOrgAdmin._id;
    await subOrganization.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Sub-organization and admin created successfully",
      data: {
        organization: subOrganization,
        admin: newOrgAdmin,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create Sub Organization With Manager Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* ======================================================
   CREATE SUB-ORGANIZATION ONLY
====================================================== */
exports.createSubOrganization = async (req, res) => {
  try {
    parseJsonFields(req.body, ["address", "geo", "settings"]);

    const payload = req.body.organizationData || req.body;
    const parentOrganizationId = resolveParentOrganizationId(
      req,
      req.body.parentOrganizationId || payload.parentOrganizationId
    );

    await validateSubOrgData({
      ...payload,
      parentOrganizationId,
    });
    validateAddressData(payload.address);
    validateGeoData(payload.geo);
    validateSettingsData(payload.settings);

    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { _id: { $in: req.orgScope } };
    const parentOrg = await Organization.findOne({
      _id: parentOrganizationId,
      ...orgFilter
    });
    if (!parentOrg) {
      return res.status(404).json({
        status: false,
        message: "Parent organization not found",
      });
    }

    if (
      req.orgScope !== "ALL" &&
      !req.orgScope.some((id) => id.toString() === parentOrganizationId.toString())
    ) {
      return res.status(403).json({
        status: false,
        message: "You are not allowed to create sub-organization under this organization",
      });
    }

    const exists = await Organization.findOne({
      $or: [
        { email: payload.email.toLowerCase().trim() },
        { phone: payload.phone.trim() },
      ],
    });
    if (exists) {
      return res.status(409).json({
        status: false,
        message: "Organization with this email or phone already exists",
      });
    }

    const slug = payload.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `${parentOrg.path}/${slug}`;
    const logo = req.file ? `/uploads/logos/${req.file.filename}` : null;

    const organization = await Organization.create({
      name: payload.name.trim(),
      organizationType: payload.organizationType,
      email: payload.email.toLowerCase().trim(),
      phone: payload.phone.trim(),
      logo,
      address: payload.address || {},
      geo: payload.geo || { timezone: "Asia/Kolkata" },
      settings: payload.settings || {},
      parentOrganizationId,
      path,
      status: "active",
      createdBy: req.user._id,
      adminUser: null,
    });

    return res.status(201).json({
      status: true,
      message: "Sub-organization created successfully",
      data: organization,
    });
  } catch (error) {
    console.error("Create Sub Organization Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};

/* ======================================================
   CREATE SUB-ADMIN ONLY
====================================================== */
exports.createSubAdmin = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await validateSubAdminData(req.body);

    const { organizationId, firstName, lastName, email, mobile, password } =
      req.body;

    // 🔐 ORG SCOPE FIX
    const orgFilter = req.orgScope === "ALL" ? {} : { _id: { $in: req.orgScope } };
    const organization = await Organization.findOne({
      _id: organizationId,
      ...orgFilter
    }).session(session);
    if (!organization) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        status: false,
        message: "Organization not found",
      });
    }

    if (
      req.orgScope !== "ALL" &&
      !req.orgScope.some((id) => id.toString() === organizationId.toString())
    ) {
      await session.abortTransaction();
      session.endSession();
      return res.status(403).json({
        status: false,
        message: "You are not allowed to add sub-admin for this organization",
      });
    }

    if (organization.adminUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        status: false,
        message: "Sub-admin already exists for this organization",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase().trim() }, { mobile: mobile.trim() }],
    }).session(session);

    if (existingUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(409).json({
        status: false,
        message: "User with this email or mobile already exists",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [subAdmin] = await User.create(
      [
        {
          organizationId: organization._id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          mobile: mobile.trim(),
          passwordHash,
          role: "admin",
          status: "active",
          createdBy: req.user._id,
        },
      ],
      { session },
    );

    organization.adminUser = subAdmin._id;
    organization.createdBy = organization.createdBy || req.user._id;
    await organization.save({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: true,
      message: "Sub-admin created successfully",
      data: subAdmin,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Create Sub Admin Error:", error);
    return res.status(error.status || 500).json({
      status: false,
      message: error.message || "Internal server error",
    });
  }
};


/* ======================================================
   GET SUB-ORGANIZATIONS
====================================================== */

exports.getSubOrganizations = async (req, res) => {
  try {
    const { page, limit, search, organizationType, status } = req.query;

    // 🔐 org scope from middleware
    if (!req.orgScope || req.orgScope === "ALL") {
      return res.status(400).json({
        status: false,
        message: "Organization scope missing",
      });
    }

    // 👇 exclude parent org itself, keep only sub-orgs
    const filter = {
      _id: { $in: req.orgScope },
      parentOrganizationId: { $ne: null },
    };

    if (organizationType) filter.organizationType = organizationType;
    if (status) filter.status = status;

    const result = await paginate(
      Organization,
      filter,
      page,
      limit,
      ["parentOrganizationId", "createdBy"],
      ["name", "email", "phone", "organizationType"],
      search
    );

    return res.status(200).json(result);
  } catch (error) {
    console.error("Get Sub Organizations Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
