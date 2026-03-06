const mongoose = require("mongoose");
const Vehicle = require("../vehicle/model");
const GpsDevice = require("../gpsDevice/model");
const Organization = require("../organizations/model");
const Driver = require("../drivers/model");
const User = require("../users/model");
const bcrypt = require("bcryptjs");
const DeviceMapping = require("../deviceMapping/model");
const {
  mapCsvRowToEntity,
  validateNormalizedRow,
} = require("./validator");

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (ch === "," && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += ch;
  }
  values.push(current);
  return values;
}

function appendError(result, rowNumber, message) {
  result.failedCount += 1;
  result.errors.push({ rowNumber, message });
}

async function preprocessChunkRows(entity, chunk, headers, req, state, result) {
  const preRows = [];
  for (const item of chunk) {
    const row = mapCsvRowToEntity(entity, headers, item.values);
    const { errors, organizationId } = validateNormalizedRow(entity, row, req);

    if (errors.length > 0) {
      appendError(result, item.rowNumber, errors.join("; "));
      continue;
    }

    row.organizationId = organizationId;
    preRows.push({ rowNumber: item.rowNumber, row });
  }

  return preRows;
}

async function validateOrganizationsBulk(preRows, result) {
  const orgIds = [...new Set(preRows.map((x) => x.row.organizationId))].map((id) => new mongoose.Types.ObjectId(id));
  const orgs = await Organization.find({ _id: { $in: orgIds } }).select("_id").lean();
  const orgSet = new Set(orgs.map((o) => String(o._id)));

  const valid = [];
  for (const item of preRows) {
    if (!orgSet.has(String(item.row.organizationId))) {
      appendError(result, item.rowNumber, "organizationId does not exist");
      continue;
    }
    valid.push(item);
  }
  return valid;
}

async function processDriversChunk(chunk, headers, req, result, state) {
  const preRows = await preprocessChunkRows("drivers", chunk, headers, req, state, result);
  if (preRows.length === 0) return;

  const orgValidatedRows = await validateOrganizationsBulk(preRows, result);
  if (orgValidatedRows.length === 0) return;

  const dedupedRows = [];
  for (const item of orgValidatedRows) {
    const key = `${item.row.organizationId}:${item.row.licenseNumber}`;
    if (state.seenDriverKeys.has(key)) {
      appendError(result, item.rowNumber, "Duplicate licenseNumber in file for same organization");
      continue;
    }
    state.seenDriverKeys.add(key);
    if (!item.row.password) {
      appendError(result, item.rowNumber, "password is required for driver user creation");
      continue;
    }
    dedupedRows.push(item);
  }
  if (dedupedRows.length === 0) return;

  const orgIds = [...new Set(dedupedRows.map((x) => x.row.organizationId))];
  const emails = [...new Set(dedupedRows.map((x) => x.row.email).filter(Boolean))];
  const phones = [...new Set(dedupedRows.map((x) => x.row.phone).filter(Boolean))];
  const licenses = [...new Set(dedupedRows.map((x) => x.row.licenseNumber).filter(Boolean))];

  const existingDrivers = await Driver.find({
    organizationId: { $in: orgIds },
    $or: [
      emails.length ? { email: { $in: emails } } : null,
      phones.length ? { phone: { $in: phones } } : null,
      licenses.length ? { licenseNumber: { $in: licenses } } : null,
    ].filter(Boolean),
  })
    .select("organizationId email phone licenseNumber")
    .lean();

  const existingDriverEmail = new Set();
  const existingDriverPhone = new Set();
  const existingDriverLicense = new Set();
  for (const d of existingDrivers) {
    if (d.email) existingDriverEmail.add(`${d.organizationId}:${d.email}`);
    if (d.phone) existingDriverPhone.add(`${d.organizationId}:${d.phone}`);
    if (d.licenseNumber) existingDriverLicense.add(`${d.organizationId}:${d.licenseNumber}`);
  }

  const existingUsers = await User.find({
    $or: [
      emails.length ? { email: { $in: emails } } : null,
      phones.length ? { mobile: { $in: phones } } : null,
    ].filter(Boolean),
  })
    .select("email mobile")
    .lean();
  const existingUserEmail = new Set(existingUsers.map((u) => u.email));
  const existingUserMobile = new Set(existingUsers.map((u) => u.mobile));

  const finalRows = [];
  for (const item of dedupedRows) {
    const orgId = item.row.organizationId;
    if (
      (item.row.email && existingDriverEmail.has(`${orgId}:${item.row.email}`)) ||
      (item.row.phone && existingDriverPhone.has(`${orgId}:${item.row.phone}`)) ||
      (item.row.licenseNumber && existingDriverLicense.has(`${orgId}:${item.row.licenseNumber}`))
    ) {
      appendError(result, item.rowNumber, "Driver with this email, phone, or license number already exists in this organization");
      continue;
    }
    if (
      (item.row.email && existingUserEmail.has(item.row.email)) ||
      (item.row.phone && existingUserMobile.has(item.row.phone))
    ) {
      appendError(result, item.rowNumber, "User with this email or mobile already exists");
      continue;
    }
    finalRows.push(item);
  }
  if (finalRows.length === 0) return;

  const driverDocs = [];
  const meta = [];
  for (const item of finalRows) {
    driverDocs.push({
      organizationId: new mongoose.Types.ObjectId(item.row.organizationId),
      assignedVehicleId: null,
      firstName: item.row.firstName,
      lastName: item.row.lastName,
      phone: item.row.phone,
      email: item.row.email,
      licenseNumber: item.row.licenseNumber,
      licenseExpiry: item.row.licenseExpiry || null,
      status: item.row.status || "active",
      availability: true,
      totalTrips: 0,
      rating: 0,
      joiningDate: new Date(),
      createdBy: req.user._id,
    });
    meta.push({
      rowNumber: item.rowNumber,
      key: `${item.row.organizationId}:${item.row.licenseNumber}`,
      organizationId: item.row.organizationId,
      email: item.row.email,
      phone: item.row.phone,
      password: item.row.password,
      firstName: item.row.firstName,
      lastName: item.row.lastName,
      status: item.row.status || "active",
    });
  }

  let failedDriverIndexes = new Set();
  try {
    await Driver.insertMany(driverDocs, { ordered: false });
  } catch (error) {
    if (error?.writeErrors?.length) {
      for (const w of error.writeErrors) {
        failedDriverIndexes.add(w.index);
        const rowNumber = meta[w.index]?.rowNumber || 0;
        if (w.code === 11000) {
          appendError(result, rowNumber, "Duplicate driver unique key conflict");
        } else {
          appendError(result, rowNumber, w.errmsg || "Driver insert failed");
        }
      }
    } else {
      throw error;
    }
  }

  const successfulMeta = meta.filter((_, idx) => !failedDriverIndexes.has(idx));
  if (successfulMeta.length === 0) return;

  const keys = successfulMeta.map((m) => {
    const [organizationId, licenseNumber] = m.key.split(":");
    return { organizationId, licenseNumber };
  });

  const insertedDrivers = await Driver.find({ $or: keys })
    .select("_id organizationId licenseNumber")
    .lean();
  const driverByKey = new Map(
    insertedDrivers.map((d) => [`${String(d.organizationId)}:${d.licenseNumber}`, d])
  );

  const userDocs = [];
  const userMeta = [];
  const passwordHashes = await Promise.all(
    successfulMeta.map((m) => bcrypt.hash(m.password, 10))
  );

  successfulMeta.forEach((m, idx) => {
    const driver = driverByKey.get(m.key);
    if (!driver) {
      appendError(result, m.rowNumber, "Driver insert failed");
      return;
    }
    userDocs.push({
      organizationId: new mongoose.Types.ObjectId(m.organizationId),
      firstName: m.firstName,
      lastName: m.lastName,
      email: m.email,
      mobile: m.phone,
      passwordHash: passwordHashes[idx],
      role: "driver",
      status: m.status,
      driverId: driver._id,
      assignedVehicleId: null,
    });
    userMeta.push(m);
  });

  let failedUserIndexes = new Set();
  try {
    if (userDocs.length > 0) {
      await User.insertMany(userDocs, { ordered: false });
    }
  } catch (error) {
    if (error?.writeErrors?.length) {
      for (const w of error.writeErrors) {
        failedUserIndexes.add(w.index);
        const rowNumber = userMeta[w.index]?.rowNumber || 0;
        if (w.code === 11000) {
          appendError(result, rowNumber, "Duplicate user unique key conflict");
        } else {
          appendError(result, rowNumber, w.errmsg || "User insert failed");
        }
      }
    } else {
      throw error;
    }
  }

  result.successCount += Math.max(0, userDocs.length - failedUserIndexes.size);
}

async function processOrganizationsChunk(chunk, headers, req, result, state) {
  const preRows = await preprocessChunkRows("organizations", chunk, headers, req, state, result);
  if (preRows.length === 0) return;

  for (const item of preRows) {
    const existing = await Organization.findOne({
      $or: [{ email: item.row.email }, { phone: item.row.phone }],
    })
      .select("_id")
      .lean();

    if (existing) {
      appendError(result, item.rowNumber, "Organization with this email or phone already exists");
      continue;
    }

    let parentOrg = null;
    let parentOrganizationId = null;
    if (req.user.role !== "superadmin") {
      parentOrganizationId = String(req.orgId || "");
    } else if (item.row.parentOrganizationId) {
      parentOrganizationId = item.row.parentOrganizationId;
    }

    if (parentOrganizationId) {
      parentOrg = await Organization.findById(parentOrganizationId).select("path").lean();
      if (!parentOrg) {
        appendError(result, item.rowNumber, "parentOrganizationId not found");
        continue;
      }
    }

    const baseSlug = item.row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
    let slug = baseSlug || `org-${Date.now()}`;
    let path = parentOrg ? `${parentOrg.path}/${slug}` : `/${slug}`;
    const existsPath = await Organization.findOne({ path }).select("_id").lean();
    if (existsPath) {
      slug = `${slug}-${Date.now()}`;
      path = parentOrg ? `${parentOrg.path}/${slug}` : `/${slug}`;
    }

    const address = {
      addressLine: item.row.addressLine || "",
      city: item.row.city || "",
      state: item.row.state || "",
      country: item.row.country || "",
      pincode: item.row.pincode || "",
    };

    try {
      await Organization.create({
        name: item.row.name,
        organizationType: item.row.organizationType,
        email: item.row.email,
        phone: item.row.phone,
        address,
        geo: { timezone: "Asia/Kolkata" },
        settings: {},
        parentOrganizationId: parentOrganizationId || null,
        path,
        adminUser: null,
        status: item.row.status || "active",
        createdBy: req.user._id,
      });
      result.successCount += 1;
    } catch (error) {
      appendError(result, item.rowNumber, error.message || "Organization import failed");
    }
  }
}

async function processUsersChunk(chunk, headers, req, result, state) {
  const preRows = await preprocessChunkRows("users", chunk, headers, req, state, result);
  if (preRows.length === 0) return;

  const orgValidatedRows = await validateOrganizationsBulk(preRows, result);
  if (orgValidatedRows.length === 0) return;

  const readyRows = [];
  for (const item of orgValidatedRows) {
    if (!item.row.password) {
      appendError(result, item.rowNumber, "password is required for user creation");
      continue;
    }
    readyRows.push(item);
  }
  if (readyRows.length === 0) return;

  const emails = [...new Set(readyRows.map((x) => x.row.email).filter(Boolean))];
  const mobiles = [...new Set(readyRows.map((x) => x.row.mobile).filter(Boolean))];

  const existingUsers = await User.find({
    $or: [
      emails.length ? { email: { $in: emails } } : null,
      mobiles.length ? { mobile: { $in: mobiles } } : null,
    ].filter(Boolean),
  })
    .select("email mobile")
    .lean();

  const existingEmail = new Set(existingUsers.map((u) => u.email));
  const existingMobile = new Set(existingUsers.map((u) => u.mobile));

  const finalRows = [];
  for (const item of readyRows) {
    if (
      (item.row.email && existingEmail.has(item.row.email)) ||
      (item.row.mobile && existingMobile.has(item.row.mobile))
    ) {
      appendError(result, item.rowNumber, "User with this email or mobile already exists");
      continue;
    }
    finalRows.push(item);
  }
  if (finalRows.length === 0) return;

  const passwordHashes = await Promise.all(
    finalRows.map((item) => bcrypt.hash(item.row.password, 10))
  );

  const docs = [];
  const meta = [];
  finalRows.forEach((item, idx) => {
    docs.push({
      organizationId: new mongoose.Types.ObjectId(item.row.organizationId),
      firstName: item.row.firstName,
      lastName: item.row.lastName,
      email: item.row.email,
      mobile: item.row.mobile,
      passwordHash: passwordHashes[idx],
      role: item.row.role,
      status: item.row.status || "active",
    });
    meta.push({ rowNumber: item.rowNumber });
  });

  try {
    await User.insertMany(docs, { ordered: false });
    result.successCount += docs.length;
  } catch (error) {
    if (error?.writeErrors?.length) {
      const failed = new Set();
      for (const w of error.writeErrors) {
        failed.add(w.index);
        const rowNumber = meta[w.index]?.rowNumber || 0;
        if (w.code === 11000) {
          appendError(result, rowNumber, "Duplicate user unique key conflict");
        } else {
          appendError(result, rowNumber, w.errmsg || "User insert failed");
        }
      }
      result.successCount += docs.length - failed.size;
      return;
    }
    throw error;
  }
}

async function processVehiclesChunk(chunk, headers, req, result, state) {
  const preRows = await preprocessChunkRows("vehicles", chunk, headers, req, state, result);
  if (preRows.length === 0) return;

  const orgValidatedRows = await validateOrganizationsBulk(preRows, result);
  if (orgValidatedRows.length === 0) return;

  const fileDeduped = [];
  for (const item of orgValidatedRows) {
    const key = `${item.row.organizationId}:${item.row.vehicleNumber}`;
    if (state.seenVehicleKeys.has(key)) {
      appendError(result, item.rowNumber, "Duplicate vehicleNumber in file for same organization");
      continue;
    }
    state.seenVehicleKeys.add(key);
    fileDeduped.push(item);
  }
  if (fileDeduped.length === 0) return;

  const dbDuplicateQuery = fileDeduped.map((x) => ({
    organizationId: x.row.organizationId,
    vehicleNumber: x.row.vehicleNumber,
  }));
  const existingVehicles = await Vehicle.find({ $or: dbDuplicateQuery })
    .select("organizationId vehicleNumber")
    .lean();
  const existingKeys = new Set(
    existingVehicles.map((x) => `${String(x.organizationId)}:${x.vehicleNumber}`)
  );

  const afterDbDedup = [];
  for (const item of fileDeduped) {
    const key = `${item.row.organizationId}:${item.row.vehicleNumber}`;
    if (existingKeys.has(key)) {
      appendError(result, item.rowNumber, "Vehicle already exists in this organization");
      continue;
    }
    afterDbDedup.push(item);
  }
  if (afterDbDedup.length === 0) return;

  const imeis = [...new Set(afterDbDedup.map((x) => x.row.deviceImei).filter(Boolean))];
  let deviceMap = new Map();
  let mappedDeviceSet = new Set();
  if (imeis.length > 0) {
    const devices = await GpsDevice.find({ imei: { $in: imeis } })
      .select("_id imei organizationId")
      .lean();
    deviceMap = new Map(devices.map((d) => [d.imei, d]));

    const activeMappings = await DeviceMapping.find({
      gpsDeviceId: { $in: devices.map((d) => d._id) },
      unassignedAt: null,
    })
      .select("gpsDeviceId")
      .lean();
    mappedDeviceSet = new Set(activeMappings.map((m) => String(m.gpsDeviceId)));
  }

  const docs = [];
  const meta = [];
  for (const item of afterDbDedup) {
    if (item.row.deviceImei) {
      const device = deviceMap.get(item.row.deviceImei);
      if (!device) {
        appendError(result, item.rowNumber, "deviceImei not found");
        continue;
      }
      if (String(device.organizationId) !== String(item.row.organizationId)) {
        appendError(result, item.rowNumber, "deviceImei belongs to different organization");
        continue;
      }
      if (mappedDeviceSet.has(String(device._id))) {
        appendError(result, item.rowNumber, "deviceImei is already actively mapped");
        continue;
      }
    }

    const payload = {
      organizationId: new mongoose.Types.ObjectId(item.row.organizationId),
      vehicleType: item.row.vehicleType,
      vehicleNumber: item.row.vehicleNumber,
      ais140Compliant: item.row.ais140Compliant === true,
      ais140CertificateNumber: item.row.ais140CertificateNumber || undefined,
      make: item.row.make || undefined,
      model: item.row.model || undefined,
      year: item.row.year ?? undefined,
      color: item.row.color || undefined,
      status: item.row.status || "active",
      runningStatus: item.row.runningStatus || "inactive",
      lastUpdated: item.row.lastUpdated || undefined,
      createdBy: req.user._id,
    };

    docs.push(payload);
    meta.push({
      rowNumber: item.rowNumber,
      key: `${item.row.organizationId}:${item.row.vehicleNumber}`,
      deviceImei: item.row.deviceImei || "",
      organizationId: item.row.organizationId,
    });
  }

  if (docs.length === 0) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const failedIndexes = new Set();
      try {
        await Vehicle.insertMany(docs, { ordered: false, session });
      } catch (error) {
        if (error?.writeErrors?.length) {
          for (const w of error.writeErrors) {
            failedIndexes.add(w.index);
            const rowNumber = meta[w.index]?.rowNumber || 0;
            if (w.code === 11000) {
              appendError(result, rowNumber, "Duplicate vehicle unique key conflict");
            } else {
              appendError(result, rowNumber, w.errmsg || "Vehicle insert failed");
            }
          }
        } else {
          throw error;
        }
      }

      const successfulMeta = meta.filter((_, idx) => !failedIndexes.has(idx));
      if (successfulMeta.length === 0) return;

      const keys = successfulMeta.map((m) => {
        const [organizationId, vehicleNumber] = m.key.split(":");
        return { organizationId, vehicleNumber };
      });

      const insertedVehicles = await Vehicle.find({ $or: keys })
        .select("_id organizationId vehicleNumber")
        .session(session)
        .lean();
      const vehicleByKey = new Map(
        insertedVehicles.map((v) => [`${String(v.organizationId)}:${v.vehicleNumber}`, v])
      );

      const mapMeta = successfulMeta.filter((m) => m.deviceImei);
      if (mapMeta.length > 0) {
        const mapImeis = [...new Set(mapMeta.map((m) => m.deviceImei))];
        const devices = await GpsDevice.find({ imei: { $in: mapImeis } })
          .select("_id imei")
          .session(session)
          .lean();
        const devByImei = new Map(devices.map((d) => [d.imei, d]));

        const now = new Date();
        const mappingDocs = [];
        const vehicleBulk = [];
        const deviceBulk = [];

        const vehicleIdsToUnassign = [];
        const deviceIdsToUnassign = [];

        for (const m of mapMeta) {
          const vehicle = vehicleByKey.get(m.key);
          const device = devByImei.get(m.deviceImei);
          if (!vehicle || !device) continue;

          vehicleIdsToUnassign.push(vehicle._id);
          deviceIdsToUnassign.push(device._id);

          mappingDocs.push({
            organizationId: vehicle.organizationId,
            vehicleId: vehicle._id,
            gpsDeviceId: device._id,
            assignedAt: now,
            unassignedAt: null,
          });

          vehicleBulk.push({
            updateOne: {
              filter: { _id: vehicle._id },
              update: { $set: { deviceId: device._id, deviceImei: m.deviceImei } },
            },
          });

          deviceBulk.push({
            updateOne: {
              filter: { _id: device._id },
              update: {
                $set: {
                  vehicleId: vehicle._id,
                  organizationId: vehicle.organizationId,
                  vehicleRegistrationNumber: vehicle.vehicleNumber,
                },
              },
            },
          });
        }

        if (vehicleIdsToUnassign.length > 0 || deviceIdsToUnassign.length > 0) {
          await DeviceMapping.updateMany(
            {
              unassignedAt: null,
              $or: [
                vehicleIdsToUnassign.length ? { vehicleId: { $in: vehicleIdsToUnassign } } : null,
                deviceIdsToUnassign.length ? { gpsDeviceId: { $in: deviceIdsToUnassign } } : null,
              ].filter(Boolean),
            },
            { $set: { unassignedAt: now } },
            { session }
          );
        }

        if (mappingDocs.length > 0) {
          await DeviceMapping.insertMany(mappingDocs, { ordered: false, session });
        }
        if (vehicleBulk.length > 0) {
          await Vehicle.bulkWrite(vehicleBulk, { session });
        }
        if (deviceBulk.length > 0) {
          await GpsDevice.bulkWrite(deviceBulk, { session });
        }
      }

      result.successCount += successfulMeta.length;
    });
  } finally {
    await session.endSession();
  }
}

async function processDevicesChunk(chunk, headers, req, result, state) {
  const preRows = await preprocessChunkRows("devices", chunk, headers, req, state, result);
  if (preRows.length === 0) return;

  const orgValidatedRows = await validateOrganizationsBulk(preRows, result);
  if (orgValidatedRows.length === 0) return;

  const fileDeduped = [];
  for (const item of orgValidatedRows) {
    if (state.seenDeviceImeis.has(item.row.imei)) {
      appendError(result, item.rowNumber, "Duplicate imei in file");
      continue;
    }
    state.seenDeviceImeis.add(item.row.imei);
    fileDeduped.push(item);
  }
  if (fileDeduped.length === 0) return;

  const existing = await GpsDevice.find({ imei: { $in: fileDeduped.map((x) => x.row.imei) } })
    .select("imei")
    .lean();
  const existingSet = new Set(existing.map((x) => x.imei));

  const docs = [];
  const meta = [];
  for (const item of fileDeduped) {
    if (existingSet.has(item.row.imei)) {
      appendError(result, item.rowNumber, "GPS device with this imei already exists");
      continue;
    }

    docs.push({
      imei: item.row.imei,
      organizationId: new mongoose.Types.ObjectId(item.row.organizationId),
      softwareVersion: item.row.softwareVersion,
      vendorId: item.row.vendorId || "ROADRPA",
      deviceModel: item.row.deviceModel || "",
      manufacturer: item.row.manufacturer || "",
      simNumber: item.row.simNumber || "",
      serialNumber: item.row.serialNumber || "",
      firmwareVersion: item.row.firmwareVersion || item.row.softwareVersion,
      hardwareVersion: item.row.hardwareVersion || "",
      warrantyExpiry: item.row.warrantyExpiry || null,
      vehicleRegistrationNumber: item.row.vehicleRegistrationNumber || undefined,
      password: item.row.password || "rpointais",
      emergencyNumber: item.row.emergencyNumber || undefined,
      userMobile1: item.row.userMobile1 || undefined,
      userMobile2: item.row.userMobile2 || undefined,
      userMobile3: item.row.userMobile3 || undefined,
      status: item.row.status || "active",
      isOnline: false,
      connectionStatus: "offline",
      createdBy: req.user._id,
    });
    meta.push({ rowNumber: item.rowNumber });
  }

  if (docs.length === 0) return;

  try {
    await GpsDevice.insertMany(docs, { ordered: false });
    result.successCount += docs.length;
  } catch (error) {
    if (error?.writeErrors?.length) {
      const failed = new Set();
      for (const w of error.writeErrors) {
        failed.add(w.index);
        const rowNumber = meta[w.index]?.rowNumber || 0;
        if (w.code === 11000) {
          appendError(result, rowNumber, "Duplicate imei unique key conflict");
        } else {
          appendError(result, rowNumber, w.errmsg || "Device insert failed");
        }
      }
      result.successCount += docs.length - failed.size;
      return;
    }
    throw error;
  }
}

async function processChunk(entity, chunk, headers, req, result, state) {
  if (entity === "vehicles") {
    await processVehiclesChunk(chunk, headers, req, result, state);
    return;
  }
  if (entity === "devices") {
    await processDevicesChunk(chunk, headers, req, result, state);
    return;
  }
  if (entity === "drivers") {
    await processDriversChunk(chunk, headers, req, result, state);
    return;
  }
  if (entity === "organizations") {
    await processOrganizationsChunk(chunk, headers, req, result, state);
    return;
  }
  if (entity === "users") {
    await processUsersChunk(chunk, headers, req, result, state);
    return;
  }
  throw { status: 400, message: "Unsupported import entity" };
}

module.exports = {
  parseCsvLine,
  processChunk,
};
