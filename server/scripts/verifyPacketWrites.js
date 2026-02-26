const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const GpsDevice = require("../Modules/gpsDevice/model");
const DeviceMapping = require("../Modules/deviceMapping/model");
const Vehicle = require("../Modules/vehicle/model");
const GpsLiveData = require("../Modules/gpsLiveData/model");
const GpsHistory = require("../Modules/gpsHistory/model");
const Alert = require("../Modules/alerts/model");
const HealthMonitoring = require("../Modules/healthMonitoring/model");
const VehicleDailyStats = require("../Modules/vehicleDailyStats/model");
const EmergencyEvent = require("../Modules/emergencyEvents/model");

function parseArgs(argv) {
  const out = {};
  argv.forEach((arg) => {
    if (!arg.startsWith("--")) return;
    const trimmed = arg.slice(2);
    const [k, ...rest] = trimmed.split("=");
    out[k] = rest.length > 0 ? rest.join("=") : true;
  });
  return out;
}

function dayStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function ensureMongoConnected() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGO_URI);
}

async function resolveDeviceContext(deviceInput) {
  const imei = typeof deviceInput === "string" ? deviceInput : deviceInput.imei;
  if (!imei) throw new Error("IMEI is required");

  const device = await GpsDevice.findOne({ imei }).lean();
  if (!device) {
    return {
      imei,
      found: false,
      gpsDeviceId: null,
      organizationId: null,
      vehicleId: null,
      vehicleNumber: null,
    };
  }

  const activeMapping = await DeviceMapping.findOne({
    gpsDeviceId: device._id,
    unassignedAt: null,
  }).lean();

  const vehicleId =
    (deviceInput && deviceInput.vehicleId) ||
    device.vehicleId ||
    activeMapping?.vehicleId ||
    null;

  let vehicle = null;
  if (vehicleId) {
    vehicle = await Vehicle.findById(vehicleId).select("vehicleNumber").lean();
  }

  return {
    imei,
    found: true,
    gpsDeviceId: device._id,
    organizationId: device.organizationId || activeMapping?.organizationId || null,
    vehicleId: vehicleId || null,
    vehicleNumber: vehicle?.vehicleNumber || null,
  };
}

function buildWindowQuery(fieldName, from, to) {
  if (!from && !to) return {};
  const window = {};
  if (from) window.$gte = new Date(from);
  if (to) window.$lte = new Date(to);
  return { [fieldName]: window };
}

async function getSnapshotForContexts(contexts, options = {}) {
  const from = options.from || null;
  const to = options.to || null;
  const snapshot = {};

  for (const ctx of contexts) {
    if (!ctx.found) {
      snapshot[ctx.imei] = {
        imei: ctx.imei,
        found: false,
      };
      continue;
    }

    const historyFilter = {
      imei: ctx.imei,
      ...buildWindowQuery("gpsTimestamp", from, to),
    };
    const alertFilter = {
      imei: ctx.imei,
      ...buildWindowQuery("gpsTimestamp", from, to),
    };
    const emergencyFilter = {
      imei: ctx.imei,
      ...buildWindowQuery("gpsTimestamp", from, to),
    };
    const healthFilter = {
      imei: ctx.imei,
      ...buildWindowQuery("timestamp", from, to),
    };

    const [deviceMeta, live, historyCount, alertCount, emergencyCount, healthCount, latestHistory, latestAlert, latestEmergency, latestHealth] =
      await Promise.all([
        GpsDevice.findOne({ imei: ctx.imei })
          .select(
            "imei status isOnline connectionStatus lastSeen lastLoginTime softwareVersion vehicleRegistrationNumber",
          )
          .lean(),
        GpsLiveData.findOne({ imei: ctx.imei })
          .select(
            "imei gpsTimestamp updatedAt movementStatus currentSpeed latitude longitude packetType ignitionStatus",
          )
          .lean(),
        GpsHistory.countDocuments(historyFilter),
        Alert.countDocuments(alertFilter),
        EmergencyEvent.countDocuments(emergencyFilter),
        HealthMonitoring.countDocuments(healthFilter),
        GpsHistory.findOne({ imei: ctx.imei })
          .sort({ gpsTimestamp: -1 })
          .select("gpsTimestamp speed packetType ignitionStatus latitude longitude")
          .lean(),
        Alert.findOne({ imei: ctx.imei })
          .sort({ gpsTimestamp: -1 })
          .select("gpsTimestamp alertId alertName packetType severity speed")
          .lean(),
        EmergencyEvent.findOne({ imei: ctx.imei })
          .sort({ gpsTimestamp: -1 })
          .select("gpsTimestamp eventType status speed heading")
          .lean(),
        HealthMonitoring.findOne({ imei: ctx.imei })
          .sort({ timestamp: -1 })
          .select("timestamp batteryPercentage memoryPercentage softwareVersion")
          .lean(),
      ]);

    const todayStats =
      ctx.vehicleId
        ? await VehicleDailyStats.findOne({
          vehicleId: ctx.vehicleId,
          date: dayStart(new Date()),
        }).lean()
        : null;

    snapshot[ctx.imei] = {
      imei: ctx.imei,
      found: true,
      context: {
        gpsDeviceId: ctx.gpsDeviceId,
        vehicleId: ctx.vehicleId,
        vehicleNumber: ctx.vehicleNumber,
        organizationId: ctx.organizationId,
      },
      deviceMeta: deviceMeta || null,
      live: live || null,
      counts: {
        history: historyCount,
        alerts: alertCount,
        emergencyEvents: emergencyCount,
        health: healthCount,
      },
      latest: {
        history: latestHistory || null,
        alert: latestAlert || null,
        emergency: latestEmergency || null,
        health: latestHealth || null,
      },
      dailyStats: todayStats
        ? {
          date: todayStats.date,
          runningTime: todayStats.runningTime || 0,
          idleTime: todayStats.idleTime || 0,
          stoppedTime: todayStats.stoppedTime || 0,
          totalDistance: todayStats.totalDistance || 0,
          maxSpeed: todayStats.maxSpeed || 0,
          alertCounts: todayStats.alertCounts || {},
        }
        : null,
    };
  }

  return snapshot;
}

function getNumeric(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function diffSnapshots(before, after) {
  const imeis = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const diff = {};

  imeis.forEach((imei) => {
    const b = before[imei] || {};
    const a = after[imei] || {};

    const bCounts = b.counts || {};
    const aCounts = a.counts || {};
    const bDaily = b.dailyStats || {};
    const aDaily = a.dailyStats || {};
    const bAlerts = bDaily.alertCounts || {};
    const aAlerts = aDaily.alertCounts || {};

    diff[imei] = {
      foundBefore: !!b.found,
      foundAfter: !!a.found,
      countDelta: {
        history: getNumeric(aCounts.history) - getNumeric(bCounts.history),
        alerts: getNumeric(aCounts.alerts) - getNumeric(bCounts.alerts),
        emergencyEvents:
          getNumeric(aCounts.emergencyEvents) - getNumeric(bCounts.emergencyEvents),
        health: getNumeric(aCounts.health) - getNumeric(bCounts.health),
      },
      liveChanged:
        (b.live?.gpsTimestamp || null) !== (a.live?.gpsTimestamp || null) ||
        (b.live?.updatedAt || null) !== (a.live?.updatedAt || null),
      deviceStatus: {
        before: b.deviceMeta?.connectionStatus || null,
        after: a.deviceMeta?.connectionStatus || null,
        lastLoginTimeBefore: b.deviceMeta?.lastLoginTime || null,
        lastLoginTimeAfter: a.deviceMeta?.lastLoginTime || null,
      },
      dailyDelta: {
        runningTime:
          getNumeric(aDaily.runningTime) - getNumeric(bDaily.runningTime),
        idleTime: getNumeric(aDaily.idleTime) - getNumeric(bDaily.idleTime),
        stoppedTime:
          getNumeric(aDaily.stoppedTime) - getNumeric(bDaily.stoppedTime),
        totalDistance:
          getNumeric(aDaily.totalDistance) - getNumeric(bDaily.totalDistance),
        maxSpeed: getNumeric(aDaily.maxSpeed),
        overspeedCount:
          getNumeric(aAlerts.overspeedCount) - getNumeric(bAlerts.overspeedCount),
      },
      latestAfter: a.latest || null,
    };
  });

  return diff;
}

async function captureSnapshotForImeis(imeis, options = {}) {
  await ensureMongoConnected();
  const contexts = [];
  for (const imei of imeis) {
    const ctx = await resolveDeviceContext({ imei });
    contexts.push(ctx);
  }
  const snapshot = await getSnapshotForContexts(contexts, options);
  return { contexts, snapshot };
}

async function runCli() {
  const args = parseArgs(process.argv.slice(2));
  const imeis = (args.imeis || "").split(",").map((v) => v.trim()).filter(Boolean);
  if (!imeis.length) {
    console.log("Usage:");
    console.log(
      "node scripts/verifyPacketWrites.js --imeis=123456789012345,123456789044455 [--from=2026-02-26T10:00:00.000Z]",
    );
    process.exit(1);
  }

  try {
    await ensureMongoConnected();
    const result = await captureSnapshotForImeis(imeis, {
      from: args.from || null,
      to: args.to || null,
    });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  runCli().catch(async (err) => {
    console.error("verifyPacketWrites failed:", err.message);
    try {
      await mongoose.connection.close();
    } catch (_) {
      // ignore
    }
    process.exit(1);
  });
}

module.exports = {
  ensureMongoConnected,
  resolveDeviceContext,
  getSnapshotForContexts,
  captureSnapshotForImeis,
  diffSnapshots,
};
