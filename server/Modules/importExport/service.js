const fs = require("fs");
const path = require("path");
const readline = require("readline");
const Vehicle = require("../vehicle/model");
const GpsDevice = require("../gpsDevice/model");
const GpsHistory = require("../gpsHistory/model");
const {
  CHUNK_SIZE,
  validateUploadedFile,
  validateEntity,
  prepareHeader,
} = require("./validator");
const { parseCsvLine, processChunk } = require("./processor");

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildExportConfig(entity) {
  if (entity === "vehicles") {
    return {
      model: Vehicle,
      filename: "vehicles-export.csv",
      headers: [
        "organizationId",
        "vehicleType",
        "vehicleNumber",
        "make",
        "model",
        "year",
        "color",
        "status",
        "runningStatus",
        "ais140Compliant",
        "ais140CertificateNumber",
        "deviceId",
        "deviceImei",
        "lastUpdated",
      ],
      mapper: (doc) => ({
        organizationId: doc.organizationId || "",
        vehicleType: doc.vehicleType || "",
        vehicleNumber: doc.vehicleNumber || "",
        make: doc.make || "",
        model: doc.model || "",
        year: doc.year ?? "",
        color: doc.color || "",
        status: doc.status || "",
        runningStatus: doc.runningStatus || "",
        ais140Compliant: doc.ais140Compliant ?? "",
        ais140CertificateNumber: doc.ais140CertificateNumber || "",
        deviceId: doc.deviceId || "",
        deviceImei: doc.deviceImei || "",
        lastUpdated: doc.lastUpdated ? new Date(doc.lastUpdated).toISOString() : "",
      }),
    };
  }

  if (entity === "devices") {
    return {
      model: GpsDevice,
      filename: "devices-export.csv",
      headers: [
        "organizationId",
        "imei",
        "softwareVersion",
        "vendorId",
        "deviceModel",
        "manufacturer",
        "simNumber",
        "serialNumber",
        "firmwareVersion",
        "hardwareVersion",
        "warrantyExpiry",
        "status",
        "vehicleId",
        "vehicleRegistrationNumber",
      ],
      mapper: (doc) => ({
        organizationId: doc.organizationId || "",
        imei: doc.imei || "",
        softwareVersion: doc.softwareVersion || "",
        vendorId: doc.vendorId || "",
        deviceModel: doc.deviceModel || "",
        manufacturer: doc.manufacturer || "",
        simNumber: doc.simNumber || "",
        serialNumber: doc.serialNumber || "",
        firmwareVersion: doc.firmwareVersion || "",
        hardwareVersion: doc.hardwareVersion || "",
        warrantyExpiry: doc.warrantyExpiry ? new Date(doc.warrantyExpiry).toISOString() : "",
        status: doc.status || "",
        vehicleId: doc.vehicleId || "",
        vehicleRegistrationNumber: doc.vehicleRegistrationNumber || "",
      }),
    };
  }

  if (entity === "history") {
    return {
      model: GpsHistory,
      filename: "history-export.csv",
      headers: [
        "organizationId",
        "vehicleId",
        "gpsDeviceId",
        "imei",
        "gpsTimestamp",
        "latitude",
        "longitude",
        "speed",
        "heading",
        "ignitionStatus",
        "packetType",
      ],
      mapper: (doc) => ({
        organizationId: doc.organizationId || "",
        vehicleId: doc.vehicleId || "",
        gpsDeviceId: doc.gpsDeviceId || "",
        imei: doc.imei || "",
        gpsTimestamp: doc.gpsTimestamp ? new Date(doc.gpsTimestamp).toISOString() : "",
        latitude: doc.latitude ?? "",
        longitude: doc.longitude ?? "",
        speed: doc.speed ?? "",
        heading: doc.heading ?? "",
        ignitionStatus: doc.ignitionStatus ?? "",
        packetType: doc.packetType || "",
      }),
    };
  }

  return null;
}

function buildExportFilter(entity, req) {
  const filter = {};

  if (req.user.role !== "superadmin") {
    filter.organizationId = req.orgId;
  } else if (req.query.organizationId) {
    filter.organizationId = req.query.organizationId;
  }

  if (entity === "history") {
    if (req.query.vehicleId) filter.vehicleId = req.query.vehicleId;
    if (req.query.imei) filter.imei = req.query.imei;
    if (req.query.from || req.query.to) {
      filter.gpsTimestamp = {};
      if (req.query.from) filter.gpsTimestamp.$gte = new Date(req.query.from);
      if (req.query.to) filter.gpsTimestamp.$lte = new Date(req.query.to);
    }
  }

  return filter;
}

async function importCsv({ entity, file, req }) {
  validateEntity(entity);
  validateUploadedFile(file);

  const result = {
    totalRows: 0,
    successCount: 0,
    failedCount: 0,
    errors: [],
  };

  const state = {
    seenVehicleKeys: new Set(),
    seenDeviceImeis: new Set(),
  };

  const stream = fs.createReadStream(file.path, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let headers = null;
  let rowNumber = 0;
  let chunk = [];
  let hasAnyDataRow = false;

  try {
    for await (const line of rl) {
      if (!headers) {
        if (!line || !line.trim()) continue;
        headers = prepareHeader(entity, parseCsvLine(line));
        continue;
      }

      if (!line || !line.trim()) continue;
      rowNumber += 1;
      hasAnyDataRow = true;
      result.totalRows += 1;

      chunk.push({ rowNumber, values: parseCsvLine(line) });
      if (chunk.length === CHUNK_SIZE) {
        await processChunk(entity, chunk, headers, req, result, state);
        chunk = [];
      }
    }

    if (!headers) {
      throw { status: 400, message: "Empty file or missing header row" };
    }

    if (!hasAnyDataRow) {
      throw { status: 400, message: "Empty file. No data rows found" };
    }

    if (chunk.length > 0) {
      await processChunk(entity, chunk, headers, req, result, state);
    }

    if (result.successCount === 0) {
      throw {
        status: 400,
        message: "No valid rows to import",
        data: result,
      };
    }

    return {
      status: true,
      message: "Import completed",
      data: result,
    };
  } finally {
    try {
      await fs.promises.unlink(file.path);
    } catch (_) {
      // ignore cleanup error
    }
  }
}

async function exportCsv({ entity, req, res }) {
  validateEntity(entity);
  const config = buildExportConfig(entity);
  if (!config) throw { status: 400, message: "Unsupported export entity" };

  const filter = buildExportFilter(entity, req);

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${config.filename}"`);
  res.write(`${config.headers.join(",")}\n`);

  const cursor = config.model.find(filter).lean().cursor();

  for await (const doc of cursor) {
    const rowObj = config.mapper(doc);
    const row = config.headers.map((h) => escapeCsv(rowObj[h])).join(",");
    res.write(`${row}\n`);
  }
  res.end();
}

module.exports = {
  importCsv,
  exportCsv,
};
