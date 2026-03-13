/**
 * Realistic TCP simulation for one vehicle with rich telemetry.
 * Usage:
 *   node scripts/realisticFullSimulation.js --imei=123456789012345 --vehicle=TS09ER1234
 * Optional:
 *   --host=127.0.0.1 --port=6000 --duration=180 --interval=5 --seed=42
 */

const net = require("net");

const DEFAULTS = {
  imei: "123456789012345",
  vehicle: "HP207585-001",
  host: "127.0.0.1",
  port: 6000,
  durationSec: 180,
  intervalSec: 5,

  // Chandigarh India Real Location
  startLat: 30.741482,
  startLng: 76.768066,

  startMileageKm: 15000,
  seed: null,
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad2 = (v) => String(v).padStart(2, "0");

function parseArgs(argv) {
  const args = {};
  argv.forEach((arg) => {
    if (!arg.startsWith("--")) return;
    const [k, ...rest] = arg.slice(2).split("=");
    args[k] = rest.length ? rest.join("=") : true;
  });
  return args;
}

function numberArg(raw, fallback) {
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function buildConfig(argv) {
  const args = parseArgs(argv);
  const cfg = {
    imei: String(args.imei || DEFAULTS.imei),
    vehicle: String(args.vehicle || DEFAULTS.vehicle),
    host: String(args.host || DEFAULTS.host),
    port: numberArg(args.port, DEFAULTS.port),
    durationSec: numberArg(args.duration, DEFAULTS.durationSec),
    intervalSec: numberArg(args.interval, DEFAULTS.intervalSec),
    startLat: numberArg(args.lat, DEFAULTS.startLat),
    startLng: numberArg(args.lng, DEFAULTS.startLng),
    startMileageKm: numberArg(args.mileage, DEFAULTS.startMileageKm),
    seed: args.seed === undefined ? DEFAULTS.seed : numberArg(args.seed, DEFAULTS.seed),
  };

  if (!/^\d{15}$/.test(cfg.imei)) {
    throw new Error("IMEI must be 15 digits");
  }
  if (cfg.durationSec < 30) {
    throw new Error("duration must be >= 30 seconds");
  }
  if (cfg.intervalSec < 2) {
    throw new Error("interval must be >= 2 seconds");
  }
  if (cfg.port <= 0 || cfg.port > 65535) {
    throw new Error("port must be 1..65535");
  }
  return cfg;
}

function createRandom(seed) {
  if (!Number.isFinite(seed)) return Math.random;
  let state = Math.floor(seed) % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function buildGpsDateTimeParts(date = new Date()) {
  const d = new Date(date);
  return {
    gpsDate: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`,
    gpsTime: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`,
  };
}

function toNmeaCoordinate(decimal, isLat) {
  const value = Number(decimal);
  const abs = Math.abs(value);
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const ddmm = degrees * 100 + minutes;
  return {
    value: ddmm.toFixed(4),
    dir: isLat ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W",
  };
}

function checksum(body) {
  let xor = 0;
  for (let i = 0; i < body.length; i += 1) xor ^= body.charCodeAt(i);
  return xor.toString(16).toUpperCase().padStart(2, "0");
}

const withChecksum = (body) => `$${body}*${checksum(body)}\n`;
const buildLogin = ({ imei, vehicleNo }) => `$LGN,${vehicleNo},${imei},2.5AIS\n`;

function buildNrm({
  imei,
  lat,
  lng,
  speed,
  heading,
  ignition = true,
  sats = 10,
  mileage = 15000,
  mainInputVoltage = 12.6,
  internalBatteryVoltage = 4.08,
  batteryLevel = 88,
  gsmSignalStrength = 24,
  fuelPercentage = 64,
  temperature = 31,
  at = new Date(),
}) {
  const { gpsDate, gpsTime } = buildGpsDateTimeParts(at);
  const latN = toNmeaCoordinate(lat, true);
  const lngN = toNmeaCoordinate(lng, false);
  const status = ignition ? "000100" : "000000";
  const body = [
    "NRM",
    imei,
    gpsDate,
    gpsTime,
    latN.value,
    latN.dir,
    lngN.value,
    lngN.dir,
    Number(speed).toFixed(1),
    Number(heading).toFixed(1),
    String(Math.max(4, Math.round(sats))),
    "250",
    "1.2",
    "0.9",
    "Airtel",
    "404",
    status,
    Number(mileage).toFixed(2),
    Number(mainInputVoltage).toFixed(2),
    Number(internalBatteryVoltage).toFixed(2),
    String(Math.max(1, Math.min(100, Math.round(batteryLevel)))),
    String(Math.max(1, Math.min(31, Math.round(gsmSignalStrength)))),
    String(Math.max(1, Math.min(100, Math.round(fuelPercentage)))),
    String(Math.round(temperature)),
  ].join(",");
  return withChecksum(body);
}

function buildAlt({ imei, type, lat, lng, speed, heading, message }) {
  const latN = toNmeaCoordinate(lat, true);
  const lngN = toNmeaCoordinate(lng, false);
  return `$ALT,${imei},${type},${latN.value},${latN.dir},${lngN.value},${lngN.dir},${Number(
    speed,
  ).toFixed(1)},${Number(heading).toFixed(1)},warning,${message || ""}\n`;
}

function buildEmergency({ imei, state = "ON", lat, lng, speed, heading }) {
  const latN = toNmeaCoordinate(lat, true);
  const lngN = toNmeaCoordinate(lng, false);
  return `$EPB,${imei},${state},${latN.value},${latN.dir},${lngN.value},${lngN.dir},${Number(
    speed,
  ).toFixed(1)},${Number(heading).toFixed(1)}\n`;
}

function buildHealth({ imei, battery = 88, signal = 24 }) {
  return `$HLM,ROADRPA,2.5AIS,${imei},${battery},20,35,60,60,0000,${signal}\n`;
}

function stepDistance(lat, lng, headingDeg, meters) {
  const rad = (headingDeg * Math.PI) / 180;
  const dLat = (meters * Math.cos(rad)) / 111320;
  const dLng = (meters * Math.sin(rad)) / (111320 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function routeHeading(index) {
  const loop = [
    35, 42, 50, 58, 66, 74, 88, 102, 118, 132, 150, 172, 198, 218, 236, 252, 270, 296, 318, 340,
  ];
  return loop[index % loop.length];
}

function logPacket(label, meta) {
  const now = new Date();
  const time = now.toISOString().substring(11, 19);
  const p = [
    `[${time}]`,
    label.padEnd(10),
    `spd:${Number(meta.speed || 0).toFixed(1)}km/h`,
    `ign:${meta.ignition ? "ON " : "OFF"}`,
    `${meta.lat.toFixed(5)},${meta.lng.toFixed(5)}`,
  ];
  if (meta.note) p.push(`| ${meta.note}`);
  console.log(p.join(" | "));
}

async function main() {
  const cfg = buildConfig(process.argv.slice(2));
  const rnd = createRandom(cfg.seed);

  const socket = new net.Socket();
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 60000);

  await new Promise((resolve, reject) => {
    socket.connect(cfg.port, cfg.host, resolve);
    socket.once("error", reject);
  });

  socket.on("data", (d) => {
    const lines = d
      .toString("utf8")
      .split(/\r?\n/)
      .map((v) => v.trim())
      .filter(Boolean);
    lines.forEach((line) => console.log(`ACK: ${line}`));
  });
  socket.on("close", () => console.log("Socket closed."));

  const send = (label, raw, meta) => {
    socket.write(raw);
    logPacket(label, meta);
  };

  let lat = cfg.startLat;
  let lng = cfg.startLng;
  let mileage = cfg.startMileageKm;
  let battery = 89;
  let fuel = 66;
  let signal = 24;
  let heading = 45;
  let ignition = true;

  const totalSteps = Math.floor(cfg.durationSec / cfg.intervalSec);
  const smoothEnd = Math.floor(totalSteps * 0.45);
  const overspeedEnd = Math.floor(totalSteps * 0.62);
  const brakeEnd = Math.floor(totalSteps * 0.7);
  const idleEnd = Math.floor(totalSteps * 0.8);
  const ignitionOffEnd = Math.floor(totalSteps * 0.88);

  console.log("Simulation config:", cfg);
  console.log("Phase 1: Login + Health");
  send("LOGIN", buildLogin({ imei: cfg.imei, vehicleNo: cfg.vehicle }), {
    speed: 0,
    ignition,
    lat,
    lng,
    note: cfg.vehicle,
  });
  await delay(1200);
  send("HEALTH", buildHealth({ imei: cfg.imei, battery, signal }), {
    speed: 0,
    ignition,
    lat,
    lng,
    note: "startup health",
  });
  await delay(1200);

  let pointsSent = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let alertsSent = 0;

  for (let i = 0; i < totalSteps; i += 1) {
    heading = (routeHeading(i) + (rnd() * 8 - 4) + 360) % 360;

    let speed;
    let phase = "cruise";
    ignition = true;

    if (i < smoothEnd) {
      speed = 34 + rnd() * 10;
      phase = "smooth";
    } else if (i < overspeedEnd) {
      speed = 84 + rnd() * 9;
      phase = "overspeed";
    } else if (i < brakeEnd) {
      const ratio = (i - overspeedEnd) / Math.max(1, brakeEnd - overspeedEnd);
      speed = 86 - ratio * 68 + rnd() * 2;
      phase = "braking";
    } else if (i < idleEnd) {
      speed = rnd() * 2;
      phase = "idle";
    } else if (i < ignitionOffEnd) {
      speed = 0;
      ignition = false;
      phase = "ign_off";
    } else {
      speed = 28 + rnd() * 10;
      phase = "resume";
    }

    speed = Math.max(0, speed);

    const meters = (speed * 1000 * cfg.intervalSec) / 3600;
    const next = stepDistance(lat, lng, heading, meters);
    lat = next.lat;
    lng = next.lng;
    mileage += meters / 1000;

    battery = Math.max(40, battery - 0.02 - rnd() * 0.03);
    fuel = Math.max(15, fuel - 0.03 - rnd() * 0.05);
    signal = Math.max(12, Math.min(31, signal + (rnd() > 0.5 ? 1 : -1)));
    const temperature = 28 + rnd() * 9;

    const nrm = buildNrm({
      imei: cfg.imei,
      lat,
      lng,
      speed,
      heading,
      ignition,
      sats: 9 + rnd() * 3,
      mileage,
      mainInputVoltage: ignition ? 12.4 + rnd() * 0.5 : 0,
      internalBatteryVoltage: 3.95 + rnd() * 0.2,
      batteryLevel: battery,
      gsmSignalStrength: signal,
      fuelPercentage: fuel,
      temperature,
      at: new Date(),
    });

    send("NRM", nrm, { speed, ignition, lat, lng, note: phase });
    pointsSent += 1;
    maxSpeed = Math.max(maxSpeed, speed);
    totalSpeed += speed;

    if (phase === "overspeed" && i % 2 === 0) {
      const alt = buildAlt({
        imei: cfg.imei,
        type: "overspeed",
        lat,
        lng,
        speed,
        heading,
        message: "Speed > 80 km/h",
      });
      send("ALT", alt, { speed, ignition, lat, lng, note: "overspeed alert" });
      alertsSent += 1;
    }

    if (i === Math.floor(totalSteps * 0.72)) {
      const epbOn = buildEmergency({
        imei: cfg.imei,
        state: "ON",
        lat,
        lng,
        speed: Math.max(5, speed),
        heading,
      });
      send("EPB", epbOn, { speed, ignition: true, lat, lng, note: "panic on" });
      alertsSent += 1;
    }

    if (i === Math.floor(totalSteps * 0.8)) {
      const epbOff = buildEmergency({
        imei: cfg.imei,
        state: "OFF",
        lat,
        lng,
        speed: Math.max(0, speed),
        heading,
      });
      send("EPB", epbOff, { speed, ignition, lat, lng, note: "panic off" });
      alertsSent += 1;
    }

    if (i > 0 && i % Math.max(1, Math.floor(60 / cfg.intervalSec)) === 0) {
      send("HEALTH", buildHealth({ imei: cfg.imei, battery: Math.round(battery), signal }), {
        speed,
        ignition,
        lat,
        lng,
        note: "periodic health",
      });
    }

    await delay(cfg.intervalSec * 1000);
  }

  await delay(800);
  socket.end();

  const avgSpeed = pointsSent ? totalSpeed / pointsSent : 0;
  console.log("\nSimulation summary");
  console.log(`IMEI            : ${cfg.imei}`);
  console.log(`Vehicle         : ${cfg.vehicle}`);
  console.log(`NRM points sent : ${pointsSent}`);
  console.log(`Max speed       : ${maxSpeed.toFixed(1)} km/h`);
  console.log(`Avg speed       : ${avgSpeed.toFixed(1)} km/h`);
  console.log(`ALT/EPB sent    : ${alertsSent}`);
  console.log(`Last location   : ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  console.log(`Last mileage    : ${mileage.toFixed(2)} km`);
}

main().catch((err) => {
  console.error("Simulation error:", err.message || err);
  process.exit(1);
});
