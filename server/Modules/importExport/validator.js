const path = require("path");
const mongoose = require("mongoose");

const CHUNK_SIZE = 2000;
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/vnd.ms-excel",
  "application/csv",
  "text/plain",
]);
const ALLOWED_EXTENSIONS = new Set([".csv"]);

const VEHICLE_STATUS = new Set(["active", "inactive", "maintenance", "decommissioned"]);
const VEHICLE_RUNNING_STATUS = new Set(["running", "idle", "stopped", "inactive"]);
const VEHICLE_TYPES = new Set(["car", "bus", "truck", "bike", "other"]);
const GPS_DEVICE_STATUS = new Set(["active", "inactive", "suspended"]);

const VEHICLE_HEADER_MAP = {
  organizationid: "organizationId",
  vehicletype: "vehicleType",
  vehiclenumber: "vehicleNumber",
  ais140compliant: "ais140Compliant",
  ais140certificatenumber: "ais140CertificateNumber",
  make: "make",
  model: "model",
  year: "year",
  color: "color",
  status: "status",
  runningstatus: "runningStatus",
  lastupdated: "lastUpdated",
  deviceimei: "deviceImei",
};

const DEVICE_HEADER_MAP = {
  organizationid: "organizationId",
  imei: "imei",
  softwareversion: "softwareVersion",
  vendorid: "vendorId",
  devicemodel: "deviceModel",
  manufacturer: "manufacturer",
  simnumber: "simNumber",
  serialnumber: "serialNumber",
  firmwareversion: "firmwareVersion",
  hardwareversion: "hardwareVersion",
  warrantyexpiry: "warrantyExpiry",
  status: "status",
  vehicleregistrationnumber: "vehicleRegistrationNumber",
  password: "password",
  emergencynumber: "emergencyNumber",
  usermobile1: "userMobile1",
  usermobile2: "userMobile2",
  usermobile3: "userMobile3",
};

const DRIVER_HEADER_MAP = {
  organizationid: "organizationId",
  firstname: "firstName",
  lastname: "lastName",
  email: "email",
  phone: "phone",
  mobilenumber: "phone",
  licensenumber: "licenseNumber",
  licenseexpiry: "licenseExpiry",
  status: "status",
  password: "password",
};

const ORGANIZATION_HEADER_MAP = {
  name: "name",
  organizationtype: "organizationType",
  email: "email",
  phone: "phone",
  addressline: "addressLine",
  city: "city",
  state: "state",
  country: "country",
  pincode: "pincode",
  parentorganizationid: "parentOrganizationId",
  status: "status",
};

const USER_HEADER_MAP = {
  organizationid: "organizationId",
  firstname: "firstName",
  lastname: "lastName",
  email: "email",
  mobile: "mobile",
  phone: "mobile",
  role: "role",
  status: "status",
  password: "password",
};

const DRIVER_STATUS = new Set(["active", "inactive", "blocked"]);
const ORG_TYPES = new Set(["logistics", "transport", "school", "taxi", "fleet"]);
const USER_ROLES = new Set(["admin", "driver"]);
const USER_STATUS = new Set(["active", "inactive"]);

function sanitizeString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeHeader(header) {
  return sanitizeString(header).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getHeaderMap(entity) {
  if (entity === "vehicles") return VEHICLE_HEADER_MAP;
  if (entity === "devices") return DEVICE_HEADER_MAP;
  if (entity === "drivers") return DRIVER_HEADER_MAP;
  if (entity === "organizations") return ORGANIZATION_HEADER_MAP;
  if (entity === "users") return USER_HEADER_MAP;
  return null;
}

function parseBoolean(value) {
  const normalized = sanitizeString(value).toLowerCase();
  if (["true", "1", "yes", "y"].includes(normalized)) return true;
  if (["false", "0", "no", "n"].includes(normalized)) return false;
  return null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value) {
  const raw = sanitizeString(value);
  if (!raw) return null;
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function validateUploadedFile(file) {
  if (!file) {
    throw { status: 400, message: "File is required" };
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw { status: 400, message: "Invalid file format. Only CSV is supported" };
  }

  if (file.mimetype && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    throw { status: 400, message: "Invalid MIME type. Only CSV uploads are allowed" };
  }
}

function validateEntity(entity) {
  if (!["vehicles", "devices", "history", "drivers", "organizations", "users"].includes(entity)) {
    throw { status: 400, message: "Unsupported entity. Allowed: vehicles, devices, history, drivers, organizations, users" };
  }
}

function mapCsvRowToEntity(entity, headerKeys, values) {
  const mapped = {};
  for (let i = 0; i < headerKeys.length; i += 1) {
    mapped[headerKeys[i]] = values[i] !== undefined ? values[i] : "";
  }

  if (entity === "vehicles") {
    const out = {
      organizationId: sanitizeString(mapped.organizationId),
      vehicleType: sanitizeString(mapped.vehicleType).toLowerCase(),
      vehicleNumber: sanitizeString(mapped.vehicleNumber).toUpperCase(),
      make: sanitizeString(mapped.make),
      model: sanitizeString(mapped.model),
      color: sanitizeString(mapped.color),
      status: sanitizeString(mapped.status).toLowerCase() || "active",
      runningStatus: sanitizeString(mapped.runningStatus).toLowerCase() || "inactive",
      ais140CertificateNumber: sanitizeString(mapped.ais140CertificateNumber),
      deviceImei: sanitizeString(mapped.deviceImei),
    };

    const ais = parseBoolean(mapped.ais140Compliant);
    if (ais !== null) out.ais140Compliant = ais;

    const year = parseNumber(mapped.year);
    if (year !== null) out.year = year;

    const lastUpdated = parseDate(mapped.lastUpdated);
    if (lastUpdated) out.lastUpdated = lastUpdated;

    return out;
  }

  if (entity === "devices") {
    const out = {
      organizationId: sanitizeString(mapped.organizationId),
      imei: sanitizeString(mapped.imei),
      softwareVersion: sanitizeString(mapped.softwareVersion),
      vendorId: sanitizeString(mapped.vendorId),
      deviceModel: sanitizeString(mapped.deviceModel),
      manufacturer: sanitizeString(mapped.manufacturer),
      simNumber: sanitizeString(mapped.simNumber),
      serialNumber: sanitizeString(mapped.serialNumber),
      firmwareVersion: sanitizeString(mapped.firmwareVersion),
      hardwareVersion: sanitizeString(mapped.hardwareVersion),
      vehicleRegistrationNumber: sanitizeString(mapped.vehicleRegistrationNumber).toUpperCase(),
      password: sanitizeString(mapped.password),
      emergencyNumber: sanitizeString(mapped.emergencyNumber),
      userMobile1: sanitizeString(mapped.userMobile1),
      userMobile2: sanitizeString(mapped.userMobile2),
      userMobile3: sanitizeString(mapped.userMobile3),
      status: sanitizeString(mapped.status).toLowerCase() || "active",
    };

    const warrantyExpiry = parseDate(mapped.warrantyExpiry);
    if (warrantyExpiry) out.warrantyExpiry = warrantyExpiry;

    return out;
  }

  if (entity === "drivers") {
    const out = {
      organizationId: sanitizeString(mapped.organizationId),
      firstName: sanitizeString(mapped.firstName),
      lastName: sanitizeString(mapped.lastName),
      email: sanitizeString(mapped.email).toLowerCase(),
      phone: sanitizeString(mapped.phone),
      licenseNumber: sanitizeString(mapped.licenseNumber).toUpperCase(),
      status: sanitizeString(mapped.status).toLowerCase() || "active",
      password: sanitizeString(mapped.password),
    };

    const licenseExpiry = parseDate(mapped.licenseExpiry);
    if (licenseExpiry) out.licenseExpiry = licenseExpiry;

    return out;
  }

  if (entity === "organizations") {
    return {
      name: sanitizeString(mapped.name),
      organizationType: sanitizeString(mapped.organizationType).toLowerCase(),
      email: sanitizeString(mapped.email).toLowerCase(),
      phone: sanitizeString(mapped.phone),
      addressLine: sanitizeString(mapped.addressLine),
      city: sanitizeString(mapped.city),
      state: sanitizeString(mapped.state),
      country: sanitizeString(mapped.country),
      pincode: sanitizeString(mapped.pincode),
      parentOrganizationId: sanitizeString(mapped.parentOrganizationId),
      status: sanitizeString(mapped.status).toLowerCase() || "active",
    };
  }

  if (entity === "users") {
    return {
      organizationId: sanitizeString(mapped.organizationId),
      firstName: sanitizeString(mapped.firstName),
      lastName: sanitizeString(mapped.lastName),
      email: sanitizeString(mapped.email).toLowerCase(),
      mobile: sanitizeString(mapped.mobile),
      role: sanitizeString(mapped.role).toLowerCase(),
      status: sanitizeString(mapped.status).toLowerCase() || "active",
      password: sanitizeString(mapped.password),
    };
  }

  return mapped;
}

function validateNormalizedRow(entity, row, req) {
  const errors = [];

  let orgId = null;
  if (entity !== "organizations" && entity !== "history") {
    orgId = req.user.role === "superadmin" ? row.organizationId : String(req.orgId || "");
    if (!orgId || !mongoose.isValidObjectId(orgId)) {
      errors.push("organizationId is required and must be a valid ObjectId");
    }
  }

  if (entity === "vehicles") {
    if (!row.vehicleType || !VEHICLE_TYPES.has(row.vehicleType)) {
      errors.push("vehicleType is required and must be one of car,bus,truck,bike,other");
    }
    if (!row.vehicleNumber) errors.push("vehicleNumber is required");
    if (row.status && !VEHICLE_STATUS.has(row.status)) {
      errors.push("status must be one of active,inactive,maintenance,decommissioned");
    }
    if (row.runningStatus && !VEHICLE_RUNNING_STATUS.has(row.runningStatus)) {
      errors.push("runningStatus must be one of running,idle,stopped,inactive");
    }
    if (row.year !== undefined && row.year !== null) {
      const thisYear = new Date().getFullYear() + 1;
      if (!Number.isFinite(row.year) || row.year < 1900 || row.year > thisYear) {
        errors.push(`year must be between 1900 and ${thisYear}`);
      }
    }
  }

  if (entity === "devices") {
    if (!row.imei) errors.push("imei is required");
    if (row.imei && row.imei.length !== 15) errors.push("imei must be exactly 15 characters");
    if (!row.softwareVersion) errors.push("softwareVersion is required");
    if (row.status && !GPS_DEVICE_STATUS.has(row.status)) {
      errors.push("status must be one of active,inactive,suspended");
    }
  }

  if (entity === "drivers") {
    if (!row.firstName) errors.push("firstName is required");
    if (!row.email) errors.push("email is required");
    if (!row.phone) errors.push("phone is required");
    if (!row.licenseNumber) errors.push("licenseNumber is required");
    if (row.status && !DRIVER_STATUS.has(row.status)) {
      errors.push("status must be one of active,inactive,blocked");
    }
  }

  if (entity === "organizations") {
    if (!row.name) errors.push("name is required");
    if (!row.organizationType || !ORG_TYPES.has(row.organizationType)) {
      errors.push("organizationType is required and must be one of logistics,transport,school,taxi,fleet");
    }
    if (!row.email) errors.push("email is required");
    if (!row.phone) errors.push("phone is required");
    if (row.status && !USER_STATUS.has(row.status)) {
      errors.push("status must be one of active,inactive");
    }
    if (row.parentOrganizationId && !mongoose.isValidObjectId(row.parentOrganizationId)) {
      errors.push("parentOrganizationId must be a valid ObjectId");
    }
  }

  if (entity === "users") {
    if (!row.firstName) errors.push("firstName is required");
    if (!row.email) errors.push("email is required");
    if (!row.mobile) errors.push("mobile is required");
    if (!row.password) errors.push("password is required");
    if (!row.role || !USER_ROLES.has(row.role)) {
      errors.push("role is required and must be one of admin,driver");
    }
    if (row.status && !USER_STATUS.has(row.status)) {
      errors.push("status must be one of active,inactive");
    }
  }

  return { errors, organizationId: orgId };
}

function prepareHeader(entity, rawHeaders) {
  const headerMap = getHeaderMap(entity);
  if (!headerMap) {
    throw { status: 400, message: "Unsupported import entity" };
  }

  const headers = rawHeaders.map((h) => headerMap[normalizeHeader(h)] || null);
  const validColumns = headers.filter(Boolean).length;
  if (validColumns === 0) {
    throw {
      status: 400,
      message: "Invalid file format. No supported columns found for selected entity",
    };
  }
  return headers;
}

module.exports = {
  CHUNK_SIZE,
  validateUploadedFile,
  validateEntity,
  prepareHeader,
  mapCsvRowToEntity,
  validateNormalizedRow,
};
