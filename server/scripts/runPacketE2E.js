const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const DeviceMapping = require("../Modules/deviceMapping/model");
const { runTcpScenario } = require("./tcpScenarioRunner");
const {
  ensureMongoConnected,
  resolveDeviceContext,
  getSnapshotForContexts,
  diffSnapshots,
} = require("./verifyPacketWrites");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

async function discoverActiveMappedDevices(limit = 2) {
  const mappings = await DeviceMapping.find({ unassignedAt: null })
    .populate("gpsDeviceId", "imei softwareVersion status vehicleRegistrationNumber")
    .populate("vehicleId", "vehicleNumber")
    .sort({ assignedAt: -1 })
    .lean();

  const out = [];
  const seen = new Set();

  for (const row of mappings) {
    const gps = row.gpsDeviceId;
    const vehicle = row.vehicleId;
    if (!gps || typeof gps !== "object") continue;
    if (!vehicle || typeof vehicle !== "object") continue;
    if (!gps.imei || gps.status !== "active") continue;
    if (seen.has(gps.imei)) continue;

    out.push({
      imei: gps.imei,
      softwareVersion: gps.softwareVersion || "2.5AIS",
      vehicleNo: gps.vehicleRegistrationNumber || vehicle.vehicleNumber,
    });
    seen.add(gps.imei);

    if (out.length >= limit) break;
  }

  return out;
}

function indexByImei(reports) {
  const map = {};
  reports.forEach((report) => {
    map[report.imei] = report;
  });
  return map;
}

function buildChecks(imei, diffRow, runRow) {
  const packetRows = runRow?.packets || [];
  const loginPackets = packetRows.filter((p) => p.label.startsWith("LOGIN"));
  const healthPackets = packetRows.filter((p) => p.label.startsWith("HLM"));
  const locationPackets = packetRows.filter((p) => p.label.startsWith("NRM"));
  const alertPackets = packetRows.filter((p) => p.label.startsWith("ALT"));
  const emergencyPackets = packetRows.filter((p) => p.label.startsWith("EPB"));
  const otaPackets = packetRows.filter((p) => p.label.startsWith("OTA"));
  const activationPackets = packetRows.filter((p) => p.label.startsWith("ACT"));

  const checks = [
    {
      name: "Login ACK count >= 2",
      pass: loginPackets.filter((p) => p.ack === "ON").length >= 2,
      detail: loginPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "Health ACK count >= 2",
      pass: healthPackets.filter((p) => p.ack === "OK").length >= 2,
      detail: healthPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "Location ACK count >= 3",
      pass: locationPackets.filter((p) => p.ack === "ACK").length >= 3,
      detail: locationPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "ALT ACK count >= 1",
      pass: alertPackets.filter((p) => p.ack === "ACK").length >= 1,
      detail: alertPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "EPB ACK count >= 2",
      pass: emergencyPackets.filter((p) => p.ack === "ACK").length >= 2,
      detail: emergencyPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "OTA ACK count >= 1",
      pass: otaPackets.filter((p) => p.ack === "OK").length >= 1,
      detail: otaPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "ACT ACK count >= 1",
      pass: activationPackets.filter((p) => p.ack === "ON").length >= 1,
      detail: activationPackets.map((p) => `${p.label}:${p.ack || "NO_ACK"}`).join(" | "),
    },
    {
      name: "Health rows inserted >= 2",
      pass: (diffRow?.countDelta?.health || 0) >= 2,
      detail: `delta=${diffRow?.countDelta?.health || 0}`,
    },
    {
      name: "History rows inserted >= 2 (4s throttle respected)",
      pass: (diffRow?.countDelta?.history || 0) >= 2,
      detail: `delta=${diffRow?.countDelta?.history || 0}`,
    },
    {
      name: "Live row updated",
      pass: !!diffRow?.liveChanged,
      detail: `liveChanged=${diffRow?.liveChanged ? "yes" : "no"}`,
    },
    {
      name: "Overspeed alert incremented",
      pass: (diffRow?.dailyDelta?.overspeedCount || 0) >= 1 || (diffRow?.countDelta?.alerts || 0) >= 1,
      detail: `dailyOverspeedDelta=${diffRow?.dailyDelta?.overspeedCount || 0}, alertsDelta=${diffRow?.countDelta?.alerts || 0}`,
    },
    {
      name: "Emergency events inserted >= 1",
      pass: (diffRow?.countDelta?.emergencyEvents || 0) >= 1,
      detail: `delta=${diffRow?.countDelta?.emergencyEvents || 0}`,
    },
    {
      name: "Device offline after socket close",
      pass: diffRow?.deviceStatus?.after === "offline",
      detail: `before=${diffRow?.deviceStatus?.before || "N/A"}, after=${diffRow?.deviceStatus?.after || "N/A"}`,
    },
  ];

  return {
    imei,
    checks,
    passCount: checks.filter((c) => c.pass).length,
    total: checks.length,
  };
}

function printReport({
  devices,
  startedAt,
  runReports,
  beforeSnapshot,
  afterSnapshot,
  diff,
  checksByDevice,
}) {
  console.log("\n================ TCP E2E VALIDATION REPORT ================");
  console.log(`Started At: ${startedAt.toISOString()}`);
  console.log(`Devices Tested: ${devices.length}`);

  devices.forEach((d, idx) => {
    console.log(
      `  ${idx + 1}. IMEI=${d.imei} | Vehicle=${d.vehicleNo || "N/A"} | SW=${d.softwareVersion || "N/A"}`,
    );
  });

  console.log("\n---------------- Packet ACK Timeline ----------------");
  runReports.forEach((report) => {
    console.log(`\nIMEI ${report.imei}`);
    (report.packets || []).forEach((pkt, i) => {
      console.log(
        `  ${i + 1}. ${pkt.label} | ACK=${pkt.ack || "NO_ACK"} | sent=${pkt.sentAt}`,
      );
    });
  });

  console.log("\n---------------- DB Delta Summary ----------------");
  Object.keys(diff).forEach((imei) => {
    const row = diff[imei];
    console.log(`\nIMEI ${imei}`);
    console.log(
      `  historyDelta=${row.countDelta.history}, healthDelta=${row.countDelta.health}, alertsDelta=${row.countDelta.alerts}, emergencyDelta=${row.countDelta.emergencyEvents}`,
    );
    console.log(
      `  runningDelta=${row.dailyDelta.runningTime}, idleDelta=${row.dailyDelta.idleTime}, stoppedDelta=${row.dailyDelta.stoppedTime}, distanceDelta=${row.dailyDelta.totalDistance}`,
    );
    console.log(
      `  connectionStatus before=${row.deviceStatus.before || "N/A"} after=${row.deviceStatus.after || "N/A"}`,
    );
  });

  console.log("\n---------------- Assertions ----------------");
  checksByDevice.forEach((summary) => {
    console.log(`\nIMEI ${summary.imei} => ${summary.passCount}/${summary.total} passed`);
    summary.checks.forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.pass ? "PASS" : "FAIL"}] ${c.name}`);
      console.log(`     ${c.detail}`);
    });
  });

  console.log("\n---------------- Raw Snapshot Handles ----------------");
  console.log(
    "Use verify script for full JSON:\n  node scripts/verifyPacketWrites.js --imeis=<comma separated>",
  );
  console.log("==========================================================\n");
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  const host = args.host || process.env.TCP_HOST || "127.0.0.1";
  const port = Number(args.port || process.env.TCP_PORT || 6000);
  const limit = Number(args.limit || 2);
  const explicitImeis = (args.imeis || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  try {
    await ensureMongoConnected();

    let devices = [];
    if (explicitImeis.length) {
      for (const imei of explicitImeis) {
        const ctx = await resolveDeviceContext({ imei });
        if (!ctx.found) continue;
        devices.push({
          imei,
          vehicleNo: ctx.vehicleNumber || "UNKNOWN",
          softwareVersion: "2.5AIS",
        });
      }
    } else {
      devices = await discoverActiveMappedDevices(limit);
    }

    if (!devices.length) {
      throw new Error(
        "No active mapped devices found. Ensure gpsDevice + deviceMapping are active.",
      );
    }

    const contexts = [];
    for (const device of devices) {
      contexts.push(await resolveDeviceContext(device));
    }

    const startedAt = new Date();
    const beforeSnapshot = await getSnapshotForContexts(contexts);

    const runReports = await runTcpScenario(devices, {
      host,
      port,
      verbose: true,
    });

    // Let async DB writes + socket close status settle.
    await delay(1800);

    const afterSnapshot = await getSnapshotForContexts(contexts);
    const diff = diffSnapshots(beforeSnapshot, afterSnapshot);
    const reportsByImei = indexByImei(runReports);
    const checksByDevice = Object.keys(diff).map((imei) =>
      buildChecks(imei, diff[imei], reportsByImei[imei]),
    );

    printReport({
      devices,
      startedAt,
      runReports,
      beforeSnapshot,
      afterSnapshot,
      diff,
      checksByDevice,
    });
  } finally {
    await mongoose.connection.close();
  }
}

if (require.main === module) {
  run().catch((err) => {
    console.error("runPacketE2E failed:", err.message);
    process.exit(1);
  });
}
