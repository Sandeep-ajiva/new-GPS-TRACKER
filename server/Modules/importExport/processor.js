const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Vehicle = require("../vehicle/model");
const GpsDevice = require("../gpsDevice/model");
const Organization = require("../organizations/model");
const Driver = require("../drivers/model");
const User = require("../users/model");
const DeviceMapping = require("../deviceMapping/model");
const { normalizeImportedRow } = require("./validator");

function addError(result, row, field, message, raw = null) {
  result.errorRowSet.add(row);
  result.errors.push({ row, field, message, raw });
}

function addDuplicate(result, row, field, message, raw = null) {
  result.duplicateRowSet.add(row);
  result.errors.push({ row, field, message, raw, type: "duplicate" });
}

async function normalizeChunkRows(entity, rows, req, context, result, options) {
  const normalizedRows = [];

  for (const item of rows) {
    const { normalized, errors } = normalizeImportedRow(entity, item.data, req, context, options);
    if (errors.length > 0) {
      errors.forEach((error) => addError(result, item.rowNumber, error.field, error.message, item.data));
      continue;
    }
    normalizedRows.push({
      rowNumber: item.rowNumber,
      raw: item.data,
      data: normalized,
    });
  }

  return normalizedRows;
}

async function processOrganizationsChunk(rows, req, context, result) {
  for (const item of rows) {
    const row = item.data;
    let parentOrganizationId = null;

    if (row.parentOrganizationId) {
      const parent = context.organizationsById.get(String(row.parentOrganizationId));
      if (!parent) {
        addError(result, item.rowNumber, "parentOrganizationId", "parentOrganizationId not found", item.raw);
        continue;
      }
      if (req.orgScope !== "ALL" && !req.orgScope.includes(String(parent._id))) {
        addError(result, item.rowNumber, "parentOrganizationId", "parentOrganizationId is outside the allowed scope", item.raw);
        continue;
      }
      parentOrganizationId = String(parent._id);
    } else if (row.parentOrganizationName) {
      const parents = context.organizationsByNormalizedName.get(String(row.parentOrganizationName).toLowerCase()) || [];
      const scopedParents =
        req.orgScope === "ALL"
          ? parents
          : parents.filter((org) => req.orgScope.includes(String(org._id)));
      if (scopedParents.length !== 1) {
        addError(result, item.rowNumber, "parentOrganizationName", "parentOrganizationName did not match exactly one accessible organization", item.raw);
        continue;
      }
      parentOrganizationId = String(scopedParents[0]._id);
    } else if (req.user.role !== "superadmin") {
      parentOrganizationId = String(req.orgId);
    }

    const duplicate = await Organization.findOne({
      $or: [
        { email: row.email },
        { phone: row.phone },
      ],
    }).select("_id").lean();

    if (duplicate) {
      addDuplicate(result, item.rowNumber, "email", "Organization with this email or phone already exists", item.raw);
      continue;
    }

    let parentPath = "";
    if (parentOrganizationId) {
      const parent = await Organization.findById(parentOrganizationId).select("path").lean();
      if (!parent) {
        addError(result, item.rowNumber, "parentOrganizationId", "parent organization was not found", item.raw);
        continue;
      }
      parentPath = parent.path;
    }

    const baseSlug = row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || `org-${Date.now()}`;
    let slug = baseSlug;
    let generatedPath = parentPath ? `${parentPath}/${slug}` : `/${slug}`;

    // Keep path unique without risking collisions from the same batch.
    // A short timestamp suffix is enough here because organization imports are low volume.
    const samePath = await Organization.findOne({ path: generatedPath }).select("_id").lean();
    if (samePath) {
      slug = `${baseSlug}-${Date.now()}`;
      generatedPath = parentPath ? `${parentPath}/${slug}` : `/${slug}`;
    }

    try {
      await Organization.create({
        name: row.name,
        organizationType: row.organizationType,
        email: row.email,
        phone: row.phone,
        address: {
          addressLine: row.addressLine || "",
          city: row.city || "",
          state: row.state || "",
          country: row.country || "",
          pincode: row.pincode || "",
        },
        geo: { timezone: "Asia/Kolkata" },
        settings: {},
        parentOrganizationId: parentOrganizationId || null,
        path: generatedPath,
        adminUser: null,
        status: row.status || "active",
        createdBy: req.user._id,
      });
      result.successfulRows += 1;
      result.summary.inserted += 1;
    } catch (error) {
      addError(result, item.rowNumber, "name", error.message || "Organization import failed", item.raw);
    }
  }
}

async function processUsersChunk(rows, req, result) {
  if (rows.length === 0) return;

  const emails = [...new Set(rows.map((item) => item.data.email).filter(Boolean))];
  const mobiles = [...new Set(rows.map((item) => item.data.mobile).filter(Boolean))];
  const existingUsers = await User.find({
    $or: [
      emails.length ? { email: { $in: emails } } : null,
      mobiles.length ? { mobile: { $in: mobiles } } : null,
    ].filter(Boolean),
  }).select("email mobile").lean();

  const existingEmail = new Set(existingUsers.map((user) => user.email));
  const existingMobile = new Set(existingUsers.map((user) => user.mobile));

  const docs = [];
  const meta = [];
  for (const item of rows) {
    const row = item.data;
    if (existingEmail.has(row.email) || existingMobile.has(row.mobile)) {
      addDuplicate(result, item.rowNumber, "email", "User with this email or mobile already exists", item.raw);
      continue;
    }

    const passwordHash = await bcrypt.hash(row.password, 10);
    docs.push({
      organizationId: new mongoose.Types.ObjectId(row.organizationId),
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      mobile: row.mobile,
      passwordHash,
      role: row.role,
      status: row.status,
    });
    meta.push(item);
  }

  if (docs.length === 0) return;

  try {
    await User.insertMany(docs, { ordered: false });
    result.successfulRows += docs.length;
    result.summary.inserted += docs.length;
  } catch (error) {
    if (!error?.writeErrors?.length) throw error;
    const failedIndexes = new Set();
    for (const writeError of error.writeErrors) {
      failedIndexes.add(writeError.index);
      const source = meta[writeError.index];
      if (writeError.code === 11000) {
        addDuplicate(result, source.rowNumber, "email", "Duplicate user unique key conflict", source.raw);
      } else {
        addError(result, source.rowNumber, "email", writeError.errmsg || "User insert failed", source.raw);
      }
    }
    const insertedCount = docs.length - failedIndexes.size;
    result.successfulRows += insertedCount;
    result.summary.inserted += insertedCount;
  }
}

async function processDevicesChunk(rows, req, result, state) {
  if (rows.length === 0) return;

  const imeis = [];
  const dedupedRows = [];
  for (const item of rows) {
    if (state.seenDeviceImeis.has(item.data.imei)) {
      addDuplicate(result, item.rowNumber, "imei", "Duplicate IMEI in file", item.raw);
      continue;
    }
    state.seenDeviceImeis.add(item.data.imei);
    imeis.push(item.data.imei);
    dedupedRows.push(item);
  }

  const existingDevices = await GpsDevice.find({ imei: { $in: imeis } }).select("imei").lean();
  const existingImeis = new Set(existingDevices.map((device) => device.imei));

  const docs = [];
  const meta = [];
  for (const item of dedupedRows) {
    const row = item.data;
    if (existingImeis.has(row.imei)) {
      addDuplicate(result, item.rowNumber, "imei", "GPS device with this IMEI already exists", item.raw);
      continue;
    }

    docs.push({
      imei: row.imei,
      organizationId: new mongoose.Types.ObjectId(row.organizationId),
      softwareVersion: row.softwareVersion,
      vendorId: row.vendorId,
      deviceModel: row.deviceModel || "",
      manufacturer: row.manufacturer || "",
      simNumber: row.simNumber || "",
      serialNumber: row.serialNumber || "",
      firmwareVersion: row.firmwareVersion || row.softwareVersion,
      hardwareVersion: row.hardwareVersion || "",
      warrantyExpiry: row.warrantyExpiry || null,
      vehicleRegistrationNumber: row.vehicleRegistrationNumber || undefined,
      password: row.password || "rpointais",
      emergencyNumber: row.emergencyNumber || undefined,
      userMobile1: row.userMobile1 || undefined,
      userMobile2: row.userMobile2 || undefined,
      userMobile3: row.userMobile3 || undefined,
      status: row.status || "active",
      isOnline: false,
      connectionStatus: "offline",
      createdBy: req.user._id,
    });
    meta.push(item);
  }

  if (docs.length === 0) return;

  try {
    await GpsDevice.insertMany(docs, { ordered: false });
    result.successfulRows += docs.length;
    result.summary.inserted += docs.length;
  } catch (error) {
    if (!error?.writeErrors?.length) throw error;
    const failedIndexes = new Set();
    for (const writeError of error.writeErrors) {
      failedIndexes.add(writeError.index);
      const source = meta[writeError.index];
      if (writeError.code === 11000) {
        addDuplicate(result, source.rowNumber, "imei", "Duplicate IMEI unique key conflict", source.raw);
      } else {
        addError(result, source.rowNumber, "imei", writeError.errmsg || "Device insert failed", source.raw);
      }
    }
    const insertedCount = docs.length - failedIndexes.size;
    result.successfulRows += insertedCount;
    result.summary.inserted += insertedCount;
  }
}

async function processDriversChunk(rows, req, result, state) {
  if (rows.length === 0) return;

  const dedupedRows = [];
  for (const item of rows) {
    const key = `${item.data.organizationId}:${item.data.licenseNumber}`;
    if (state.seenDriverKeys.has(key)) {
      addDuplicate(result, item.rowNumber, "licenseNumber", "Duplicate licenseNumber in file for the same organization", item.raw);
      continue;
    }
    state.seenDriverKeys.add(key);
    dedupedRows.push(item);
  }

  const orgIds = [...new Set(dedupedRows.map((item) => item.data.organizationId))];
  const emails = [...new Set(dedupedRows.map((item) => item.data.email).filter(Boolean))];
  const phones = [...new Set(dedupedRows.map((item) => item.data.phone).filter(Boolean))];
  const licenseNumbers = [...new Set(dedupedRows.map((item) => item.data.licenseNumber).filter(Boolean))];

  const existingDrivers = await Driver.find({
    organizationId: { $in: orgIds },
    $or: [
      emails.length ? { email: { $in: emails } } : null,
      phones.length ? { phone: { $in: phones } } : null,
      licenseNumbers.length ? { licenseNumber: { $in: licenseNumbers } } : null,
    ].filter(Boolean),
  }).select("organizationId email phone licenseNumber").lean();

  const driverKeys = new Set();
  for (const driver of existingDrivers) {
    driverKeys.add(`${driver.organizationId}:${driver.email}`);
    driverKeys.add(`${driver.organizationId}:${driver.phone}`);
    driverKeys.add(`${driver.organizationId}:${driver.licenseNumber}`);
  }

  const existingUsers = await User.find({
    $or: [
      emails.length ? { email: { $in: emails } } : null,
      phones.length ? { mobile: { $in: phones } } : null,
    ].filter(Boolean),
  }).select("email mobile").lean();
  const existingUserEmails = new Set(existingUsers.map((user) => user.email));
  const existingUserMobiles = new Set(existingUsers.map((user) => user.mobile));

  const driverDocs = [];
  const driverMeta = [];
  for (const item of dedupedRows) {
    const row = item.data;
    const rowKeys = [
      `${row.organizationId}:${row.email}`,
      `${row.organizationId}:${row.phone}`,
      `${row.organizationId}:${row.licenseNumber}`,
    ];
    if (rowKeys.some((key) => driverKeys.has(key))) {
      addDuplicate(result, item.rowNumber, "licenseNumber", "Driver with this email, phone, or license number already exists in this organization", item.raw);
      continue;
    }
    if (existingUserEmails.has(row.email) || existingUserMobiles.has(row.phone)) {
      addDuplicate(result, item.rowNumber, "email", "User with this email or mobile already exists", item.raw);
      continue;
    }

    driverDocs.push({
      organizationId: new mongoose.Types.ObjectId(row.organizationId),
      assignedVehicleId: null,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      email: row.email,
      licenseNumber: row.licenseNumber,
      licenseExpiry: row.licenseExpiry || null,
      status: row.status || "active",
      availability: true,
      totalTrips: 0,
      rating: 0,
      joiningDate: new Date(),
    });
    driverMeta.push(item);
  }

  if (driverDocs.length === 0) return;

  let insertedDrivers = [];
  try {
    insertedDrivers = await Driver.insertMany(driverDocs, { ordered: false });
  } catch (error) {
    if (!error?.writeErrors?.length) throw error;
    const failedIndexes = new Set();
    for (const writeError of error.writeErrors) {
      failedIndexes.add(writeError.index);
      const source = driverMeta[writeError.index];
      if (writeError.code === 11000) {
        addDuplicate(result, source.rowNumber, "licenseNumber", "Duplicate driver unique key conflict", source.raw);
      } else {
        addError(result, source.rowNumber, "licenseNumber", writeError.errmsg || "Driver insert failed", source.raw);
      }
    }
    insertedDrivers = driverDocs
      .map((doc, index) => (!failedIndexes.has(index) ? doc : null))
      .filter(Boolean);
  }

  if (insertedDrivers.length === 0) return;

  const persistedDrivers = await Driver.find({
    $or: insertedDrivers.map((doc) => ({
      organizationId: doc.organizationId,
      licenseNumber: doc.licenseNumber,
    })),
  }).select("_id organizationId licenseNumber").lean();
  const driverByKey = new Map(
    persistedDrivers.map((driver) => [`${driver.organizationId}:${driver.licenseNumber}`, driver]),
  );

  const userDocs = [];
  const userMeta = [];
  for (const item of driverMeta) {
    const driver = driverByKey.get(`${item.data.organizationId}:${item.data.licenseNumber}`);
    if (!driver) continue;
    const passwordHash = await bcrypt.hash(item.data.password, 10);
    userDocs.push({
      organizationId: new mongoose.Types.ObjectId(item.data.organizationId),
      firstName: item.data.firstName,
      lastName: item.data.lastName,
      email: item.data.email,
      mobile: item.data.phone,
      passwordHash,
      role: "driver",
      status: item.data.status || "active",
      driverId: driver._id,
      assignedVehicleId: null,
    });
    userMeta.push(item);
  }

  if (userDocs.length === 0) return;

  try {
    await User.insertMany(userDocs, { ordered: false });
    result.successfulRows += userDocs.length;
    result.summary.inserted += userDocs.length;
  } catch (error) {
    if (!error?.writeErrors?.length) throw error;
    const failedIndexes = new Set();
    for (const writeError of error.writeErrors) {
      failedIndexes.add(writeError.index);
      const source = userMeta[writeError.index];
      if (writeError.code === 11000) {
        addDuplicate(result, source.rowNumber, "email", "Duplicate user unique key conflict", source.raw);
      } else {
        addError(result, source.rowNumber, "email", writeError.errmsg || "User insert failed", source.raw);
      }
    }
    const insertedCount = userDocs.length - failedIndexes.size;
    result.successfulRows += insertedCount;
    result.summary.inserted += insertedCount;
  }
}

async function processVehiclesChunk(rows, req, result, state) {
  if (rows.length === 0) return;

  const dedupedRows = [];
  for (const item of rows) {
    const key = `${item.data.organizationId}:${item.data.vehicleNumber}`;
    if (state.seenVehicleKeys.has(key)) {
      addDuplicate(result, item.rowNumber, "vehicleNumber", "Duplicate vehicleNumber in file for the same organization", item.raw);
      continue;
    }
    state.seenVehicleKeys.add(key);
    dedupedRows.push(item);
  }

  const existingVehicles = await Vehicle.find({
    $or: dedupedRows.map((item) => ({
      organizationId: item.data.organizationId,
      vehicleNumber: item.data.vehicleNumber,
    })),
  }).select("organizationId vehicleNumber").lean();
  const existingKeys = new Set(existingVehicles.map((vehicle) => `${vehicle.organizationId}:${vehicle.vehicleNumber}`));

  const imeis = [...new Set(dedupedRows.map((item) => item.data.deviceImei).filter(Boolean))];
  const devices = imeis.length
    ? await GpsDevice.find({ imei: { $in: imeis } }).select("_id imei organizationId").lean()
    : [];
  const deviceByImei = new Map(devices.map((device) => [device.imei, device]));

  const activeMappings = devices.length
    ? await DeviceMapping.find({
        gpsDeviceId: { $in: devices.map((device) => device._id) },
        unassignedAt: null,
      }).select("gpsDeviceId").lean()
    : [];
  const mappedDeviceIds = new Set(activeMappings.map((mapping) => String(mapping.gpsDeviceId)));

  const docs = [];
  const meta = [];
  for (const item of dedupedRows) {
    const row = item.data;
    const uniqueKey = `${row.organizationId}:${row.vehicleNumber}`;
    if (existingKeys.has(uniqueKey)) {
      addDuplicate(result, item.rowNumber, "vehicleNumber", "Vehicle already exists in this organization", item.raw);
      continue;
    }

    if (row.deviceImei) {
      const device = deviceByImei.get(row.deviceImei);
      if (!device) {
        addError(result, item.rowNumber, "deviceImei", "deviceImei not found", item.raw);
        continue;
      }
      if (String(device.organizationId) !== String(row.organizationId)) {
        addError(result, item.rowNumber, "deviceImei", "deviceImei belongs to a different organization", item.raw);
        continue;
      }
      if (mappedDeviceIds.has(String(device._id))) {
        addDuplicate(result, item.rowNumber, "deviceImei", "deviceImei is already actively mapped", item.raw);
        continue;
      }
    }

    docs.push({
      organizationId: new mongoose.Types.ObjectId(row.organizationId),
      vehicleType: row.vehicleType,
      vehicleNumber: row.vehicleNumber,
      ais140Compliant: row.ais140Compliant === true,
      ais140CertificateNumber: row.ais140CertificateNumber || undefined,
      make: row.make || undefined,
      model: row.model || undefined,
      year: row.year ?? undefined,
      color: row.color || undefined,
      status: row.status || "active",
      runningStatus: row.runningStatus || "inactive",
      lastUpdated: row.lastUpdated || undefined,
      createdBy: req.user._id,
    });
    meta.push(item);
  }

  if (docs.length === 0) return;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      let insertResult = [];
      try {
        insertResult = await Vehicle.insertMany(docs, { ordered: false, session });
      } catch (error) {
        if (!error?.writeErrors?.length) throw error;
        const failedIndexes = new Set();
        for (const writeError of error.writeErrors) {
          failedIndexes.add(writeError.index);
          const source = meta[writeError.index];
          if (writeError.code === 11000) {
            addDuplicate(result, source.rowNumber, "vehicleNumber", "Duplicate vehicle unique key conflict", source.raw);
          } else {
            addError(result, source.rowNumber, "vehicleNumber", writeError.errmsg || "Vehicle insert failed", source.raw);
          }
        }
        insertResult = docs
          .map((doc, index) => (!failedIndexes.has(index) ? doc : null))
          .filter(Boolean);
      }

      const persistedVehicles = await Vehicle.find({
        $or: insertResult.map((doc) => ({
          organizationId: doc.organizationId,
          vehicleNumber: doc.vehicleNumber,
        })),
      }).select("_id organizationId vehicleNumber").session(session).lean();
      const vehicleByKey = new Map(
        persistedVehicles.map((vehicle) => [`${vehicle.organizationId}:${vehicle.vehicleNumber}`, vehicle]),
      );

      const mappingDocs = [];
      const vehicleUpdates = [];
      const deviceUpdates = [];
      const vehicleIdsToUnassign = [];
      const deviceIdsToUnassign = [];
      const now = new Date();

      for (const item of meta) {
        if (!item.data.deviceImei) continue;
        const vehicle = vehicleByKey.get(`${item.data.organizationId}:${item.data.vehicleNumber}`);
        const device = deviceByImei.get(item.data.deviceImei);
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
        vehicleUpdates.push({
          updateOne: {
            filter: { _id: vehicle._id },
            update: { $set: { deviceId: device._id, deviceImei: item.data.deviceImei } },
          },
        });
        deviceUpdates.push({
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

      if (vehicleIdsToUnassign.length || deviceIdsToUnassign.length) {
        await DeviceMapping.updateMany(
          {
            unassignedAt: null,
            $or: [
              vehicleIdsToUnassign.length ? { vehicleId: { $in: vehicleIdsToUnassign } } : null,
              deviceIdsToUnassign.length ? { gpsDeviceId: { $in: deviceIdsToUnassign } } : null,
            ].filter(Boolean),
          },
          { $set: { unassignedAt: now } },
          { session },
        );
      }
      if (mappingDocs.length) {
        await DeviceMapping.insertMany(mappingDocs, { ordered: false, session });
      }
      if (vehicleUpdates.length) {
        await Vehicle.bulkWrite(vehicleUpdates, { session });
      }
      if (deviceUpdates.length) {
        await GpsDevice.bulkWrite(deviceUpdates, { session });
      }

      result.successfulRows += persistedVehicles.length;
      result.summary.inserted += persistedVehicles.length;
    });
  } finally {
    await session.endSession();
  }
}

async function processChunk(entity, rows, req, context, result, state, options) {
  const normalizedRows = await normalizeChunkRows(entity, rows, req, context, result, options);
  if (normalizedRows.length === 0) return;

  if (entity === "organizations") {
    await processOrganizationsChunk(normalizedRows, req, context, result);
    return;
  }
  if (entity === "users") {
    await processUsersChunk(normalizedRows, req, result);
    return;
  }
  if (entity === "devices") {
    await processDevicesChunk(normalizedRows, req, result, state);
    return;
  }
  if (entity === "drivers") {
    await processDriversChunk(normalizedRows, req, result, state);
    return;
  }
  if (entity === "vehicles") {
    await processVehiclesChunk(normalizedRows, req, result, state);
    return;
  }
  throw { status: 400, message: "Unsupported import entity" };
}

module.exports = {
  processChunk,
};
