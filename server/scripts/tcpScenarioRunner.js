const net = require("net");
const {
  buildLoginPacket,
  buildHealthPacket,
  buildNrmPacket,
  buildAlertPacket,
  buildEmergencyPacket,
  buildOtaPacket,
  buildActivationPacket,
} = require("./tcpPacketBuilders");

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

function createAckChannel(socket) {
  const waiters = [];
  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString("utf8");
    const parts = buffer.split(/\r?\n/);
    buffer = parts.pop() || "";

    parts
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((line) => {
        const waiter = waiters.shift();
        if (waiter && !waiter.done) {
          waiter.done = true;
          clearTimeout(waiter.timer);
          waiter.resolve({
            ack: line,
            timedOut: false,
            receivedAt: new Date().toISOString(),
          });
        }
      });
  });

  return (timeoutMs = 3000) =>
    new Promise((resolve) => {
      const waiter = {
        done: false,
        resolve,
        timer: null,
      };

      waiter.timer = setTimeout(() => {
        if (waiter.done) return;
        waiter.done = true;
        const idx = waiters.indexOf(waiter);
        if (idx >= 0) waiters.splice(idx, 1);
        resolve({
          ack: null,
          timedOut: true,
          receivedAt: null,
        });
      }, timeoutMs);

      waiters.push(waiter);
    });
}

async function connectSocket(host, port) {
  const socket = new net.Socket();

  await new Promise((resolve, reject) => {
    const onError = (err) => {
      socket.removeListener("connect", onConnect);
      reject(err);
    };
    const onConnect = () => {
      socket.removeListener("error", onError);
      resolve();
    };

    socket.once("error", onError);
    socket.once("connect", onConnect);
    socket.connect(port, host);
  });

  socket.setNoDelay(true);
  socket.setKeepAlive(true, 60000);
  return socket;
}

async function closeSocket(socket) {
  if (!socket || socket.destroyed) return;

  await new Promise((resolve) => {
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };

    const timer = setTimeout(finish, 1200);
    socket.once("close", () => {
      clearTimeout(timer);
      finish();
    });
    socket.end();
  });
}

async function sendPacket({ socket, waitAck, label, packet, timeoutMs = 3500 }) {
  const sentAt = new Date().toISOString();
  socket.write(packet);
  const ackResult = await waitAck(timeoutMs);

  return {
    label,
    sentAt,
    packet: packet.trim(),
    ack: ackResult.ack,
    ackTimedOut: ackResult.timedOut,
    ackAt: ackResult.receivedAt,
  };
}

function buildDeviceScenarioPackets(device, index = 0) {
  const softwareVersion = device.softwareVersion || "2.5AIS";
  const vehicleNo =
    device.vehicleNo ||
    device.vehicleNumber ||
    device.vehicleRegistrationNumber ||
    `VEH${index + 1}`;

  const lat0 = Number(device.baseLat ?? 30.7408333333 + index * 0.01);
  const lng0 = Number(device.baseLng ?? 76.7676466667 + index * 0.01);
  const mileage0 = Number(device.startMileage ?? 15000 + index * 250);

  return [
    {
      label: "LOGIN#1",
      packet: buildLoginPacket({
        imei: device.imei,
        vehicleNo,
        softwareVersion,
      }),
      waitAfterMs: 250,
    },
    {
      label: "LOGIN#2",
      packet: buildLoginPacket({
        imei: device.imei,
        vehicleNo,
        softwareVersion,
      }),
      waitAfterMs: 250,
    },
    {
      label: "HLM#1",
      packet: buildHealthPacket({
        imei: device.imei,
        softwareVersion,
        batteryPercentage: 86,
        lowBatteryThreshold: 20,
        memoryPercentage: 32,
        dataUpdateRateIgnitionOn: 60,
        dataUpdateRateIgnitionOff: 60,
      }),
      waitAfterMs: 300,
    },
    {
      label: "HLM#2",
      packet: buildHealthPacket({
        imei: device.imei,
        softwareVersion,
        batteryPercentage: 82,
        lowBatteryThreshold: 20,
        memoryPercentage: 35,
        dataUpdateRateIgnitionOn: 60,
        dataUpdateRateIgnitionOff: 60,
      }),
      waitAfterMs: 300,
    },
    {
      label: "NRM#1",
      packet: buildNrmPacket({
        imei: device.imei,
        latitude: lat0,
        longitude: lng0,
        speed: 34,
        heading: 35,
        numberOfSatellites: 9,
        ignition: true,
        currentMileage: mileage0,
      }),
      waitAfterMs: 1000,
    },
    {
      label: "NRM#2(<4s)",
      packet: buildNrmPacket({
        imei: device.imei,
        latitude: lat0 + 0.00035,
        longitude: lng0 + 0.0004,
        speed: 42,
        heading: 48,
        numberOfSatellites: 10,
        ignition: true,
        currentMileage: mileage0 + 0.09,
      }),
      waitAfterMs: 4700,
    },
    {
      label: "ALT#1",
      packet: buildAlertPacket({
        imei: device.imei,
        alertIdentifier: "overspeed",
        latitude: lat0 + 0.00045,
        longitude: lng0 + 0.00052,
        speed: 118,
        heading: 52,
        severity: "warning",
        message: "Speed threshold exceeded",
      }),
      waitAfterMs: 350,
    },
    {
      label: "EPB#1(ON)",
      packet: buildEmergencyPacket({
        imei: device.imei,
        state: "ON",
        latitude: lat0 + 0.00055,
        longitude: lng0 + 0.0006,
        speed: 28,
        heading: 67,
      }),
      waitAfterMs: 350,
    },
    {
      label: "OTA#1",
      packet: buildOtaPacket({
        imei: device.imei,
        status: "SUCCESS",
        fromVersion: softwareVersion,
        toVersion: "2.6AIS",
        details: "Firmware update success",
      }),
      waitAfterMs: 350,
    },
    {
      label: "ACT#1",
      packet: buildActivationPacket({
        imei: device.imei,
        status: "ON",
        details: "Activated by server",
      }),
      waitAfterMs: 350,
    },
    {
      label: "NRM#3(overspeed)",
      packet: buildNrmPacket({
        imei: device.imei,
        latitude: lat0 + 0.0008,
        longitude: lng0 + 0.00095,
        speed: 140,
        heading: 59,
        numberOfSatellites: 11,
        ignition: true,
        currentMileage: mileage0 + 0.2,
      }),
      waitAfterMs: 800,
    },
    {
      label: "EPB#2(OFF)",
      packet: buildEmergencyPacket({
        imei: device.imei,
        state: "OFF",
        latitude: lat0 + 0.00092,
        longitude: lng0 + 0.00102,
        speed: 7,
        heading: 20,
      }),
      waitAfterMs: 300,
    },
    {
      label: "NRM#4(ignition_off)",
      packet: buildNrmPacket({
        imei: device.imei,
        latitude: lat0 + 0.001,
        longitude: lng0 + 0.0011,
        speed: 0,
        heading: 0,
        numberOfSatellites: 8,
        ignition: false,
        currentMileage: mileage0 + 0.21,
      }),
      waitAfterMs: 400,
    },
  ];
}

async function runDeviceScenario(device, options = {}, index = 0) {
  const host = options.host || process.env.TCP_HOST || "127.0.0.1";
  const port = Number(options.port || process.env.TCP_PORT || 6000);
  const verbose = options.verbose !== false;

  const report = {
    imei: device.imei,
    vehicleNo:
      device.vehicleNo || device.vehicleNumber || device.vehicleRegistrationNumber || null,
    host,
    port,
    startedAt: new Date().toISOString(),
    packets: [],
    errors: [],
  };

  const socket = await connectSocket(host, port);
  const waitAck = createAckChannel(socket);

  socket.on("error", (err) => {
    report.errors.push(`Socket error: ${err.message}`);
  });

  const scenarioPackets = buildDeviceScenarioPackets(device, index);

  for (const step of scenarioPackets) {
    const result = await sendPacket({
      socket,
      waitAck,
      label: step.label,
      packet: step.packet,
      timeoutMs: Number(options.ackTimeoutMs || 3500),
    });

    report.packets.push(result);
    if (verbose) {
      const ackText = result.ackTimedOut ? "NO_ACK" : result.ack;
      console.log(`[${device.imei}] ${step.label} -> ${ackText}`);
    }

    if (step.waitAfterMs) await delay(step.waitAfterMs);
  }

  await closeSocket(socket);
  report.endedAt = new Date().toISOString();
  return report;
}

async function runTcpScenario(devices, options = {}) {
  const reports = [];
  for (let i = 0; i < devices.length; i += 1) {
    const report = await runDeviceScenario(devices[i], options, i);
    reports.push(report);
  }
  return reports;
}

async function runFromCli() {
  const args = parseArgs(process.argv.slice(2));
  const imeis = (args.imeis || "").split(",").map((v) => v.trim()).filter(Boolean);
  const vehicles = (args.vehicles || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const versions = (args.versions || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  if (!imeis.length) {
    console.log("Usage:");
    console.log(
      "node scripts/tcpScenarioRunner.js --imeis=123...,456... --vehicles=TS09...,PB10...",
    );
    process.exit(1);
  }

  const devices = imeis.map((imei, idx) => ({
    imei,
    vehicleNo: vehicles[idx] || `VEH${idx + 1}`,
    softwareVersion: versions[idx] || "2.5AIS",
  }));

  const reports = await runTcpScenario(devices, {
    host: args.host,
    port: args.port,
    verbose: true,
  });

  console.log("\nScenario complete:");
  console.log(JSON.stringify(reports, null, 2));
}

if (require.main === module) {
  runFromCli().catch((err) => {
    console.error("tcpScenarioRunner failed:", err.message);
    process.exit(1);
  });
}

module.exports = {
  runTcpScenario,
  runDeviceScenario,
};
