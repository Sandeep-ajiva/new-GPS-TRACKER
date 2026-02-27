const mongoose = require("mongoose");
const Vehicle = require("../vehicle/model");
const GpsDevice = require("../gpsDevice/model");
const Organization = require("../organizations/model");
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
  throw { status: 400, message: "Import supported only for vehicles and devices" };
}

module.exports = {
  parseCsvLine,
  processChunk,
};
