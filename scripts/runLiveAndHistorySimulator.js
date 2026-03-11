/**
 * Long-run TCP simulator to validate Live Tracking, History Playback, and Daily Status.
 * - Streams realistic packets along a route (Chandigarh area by default).
 * - Covers moving, overspeed, idle, full stop, emergency, and health.
 * Run: node scripts/runLiveAndHistorySimulator.js
 */

const net = require("net");
const path = require("path");
try {
  // Optional: load env; if dotenv not installed, continue.
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch (_) {
  // eslint-disable-next-line no-console
  console.warn("dotenv not found; continuing without .env");
}

// EDITABLE: IMEI & Vehicle No
const IMEI = process.env.SIM_IMEI || "123456789012345"; // set to mapped device IMEI
const VEHICLE_NO = process.env.SIM_VEHICLE || "TS09ER1234"; // set to mapped vehicle number

// TCP target (matches backend listener)
const HOST = process.env.TCP_HOST || "127.0.0.1";
const PORT = Number(process.env.TCP_PORT || 5000); // set to your TCP listener (often 6000)

// Helpers
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (v) => String(v).padStart(2, "0");
const checksum = (body) => {
  let xor = 0;
  for (let i = 0; i < body.length; i++) xor ^= body.charCodeAt(i);
  return xor.toString(16).toUpperCase().padStart(2, "0");
};
const toNmea = (dec, isLat) => {
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const ddmm = deg * 100 + min;
  return {
    v: ddmm.toFixed(4),
    d: isLat ? (dec >= 0 ? "N" : "S") : dec >= 0 ? "E" : "W",
  };
};
const dateParts = (d = new Date()) => {
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = pad2(d.getFullYear() % 100);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return { gpsDate: `${dd}${mm}${yy}`, gpsTime: `${hh}${mi}${ss}` };
};
const withChecksum = (body) => `$${body}*${checksum(body)}\n`;

// Packet builders (minimal)
const buildLogin = () => `$LGN,${VEHICLE_NO},${IMEI},2.5AIS\n`;
const buildHealth = () => `$HLM,ROADRPA,2.5AIS,${IMEI},88,20,30,30,60,0000,24\n`;
const buildNrm = ({ lat, lng, speed, heading, ignition, mileage, voltage, at }) => {
  const { gpsDate, gpsTime } = dateParts(at);
  const latN = toNmea(lat, true);
  const lngN = toNmea(lng, false);
  const status = ignition ? "000100" : "000000";
  const body = [
    "NRM",
    IMEI,
    gpsDate,
    gpsTime,
    latN.v,
    latN.d,
    lngN.v,
    lngN.d,
    speed.toFixed(1),
    heading.toFixed(1),
    "10",
    "250",
    "1.2",
    "0.9",
    "Simulator",
    "404",
    status,
    mileage.toFixed(1),
    voltage.toFixed(2),
  ].join(",");
  return withChecksum(body);
};
const buildAlt = ({ type, lat, lng, speed, heading }) => {
  const latN = toNmea(lat, true);
  const lngN = toNmea(lng, false);
  return `$ALT,${IMEI},${type},${latN.v},${latN.d},${lngN.v},${lngN.d},${speed.toFixed(1)},${heading.toFixed(1)},warning,\n`;
};
const buildEmergency = ({ lat, lng, speed, heading }) => {
  const latN = toNmea(lat, true);
  const lngN = toNmea(lng, false);
  return `$EPB,${IMEI},ON,${latN.v},${latN.d},${lngN.v},${lngN.d},${speed.toFixed(1)},${heading.toFixed(1)}\n`;
};

// Route waypoints (approx Chandigarh loop)
const waypoints = [
  [30.7333, 76.7794],
  [30.7360, 76.7825],
  [30.7392, 76.7890],
  [30.7425, 76.7945],
  [30.7460, 76.8000],
  [30.7495, 76.8060], // overspeed stretch
  [30.7530, 76.8120],
  [30.7565, 76.8180],
  [30.7600, 76.8240], // idle area
  [30.7630, 76.8290],
  [30.7655, 76.8330], // emergency point
];

async function stream() {
  const socket = new net.Socket();
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 60000);

  await new Promise((res, rej) => {
    socket.connect(PORT, HOST, res);
    socket.on("error", rej);
  });
  socket.on("data", () => { });

  let mileage = 15000;
  let voltage = 12.8;
  let heading = 45;

  const send = (label, pkt, meta = {}) => {
    socket.write(pkt);
    const t = new Date().toISOString().substring(11, 19);
    console.log(`[${t}] ${label}:`, meta);
  };

  // Login + Health
  send("LOGIN", buildLogin());
  await delay(1000);
  send("HEALTH", buildHealth());

  // Pass 1: normal cruise 40 km/h
  for (let i = 0; i < waypoints.length; i++) {
    const [lat, lng] = waypoints[i];
    const speed = 38 + Math.random() * 6;
    heading = (heading + 10) % 360;
    mileage += speed / 3600 * 3;
    voltage = Math.max(12.2, voltage - 0.005);
    send("NRM", buildNrm({ lat, lng, speed, heading, ignition: true, mileage, voltage, at: new Date() }), { lat, lng, speed });
    await delay(3000);
  }

  // Overspeed burst
  for (let i = 5; i <= 7; i++) {
    const [lat, lng] = waypoints[i];
    const speed = 88 + Math.random() * 4;
    heading = (heading + 8) % 360;
    mileage += speed / 3600 * 2;
    send("ALT-OS", buildAlt({ type: "overspeed", lat, lng, speed, heading }), { speed });
    send("NRM", buildNrm({ lat, lng, speed, heading, ignition: true, mileage, voltage, at: new Date() }), { lat, lng, speed });
    await delay(2000);
  }

  // Idle block (ignition ON, speed 0)
  for (let j = 0; j < 4; j++) {
    const [lat, lng] = waypoints[8];
    send("NRM", buildNrm({ lat, lng, speed: 0, heading, ignition: true, mileage, voltage, at: new Date() }), { lat, lng, speed: 0, state: "idle" });
    await delay(3000);
  }

  // Full stop (ignition OFF)
  for (let j = 0; j < 3; j++) {
    const [lat, lng] = waypoints[8];
    send("NRM", buildNrm({ lat, lng, speed: 0, heading, ignition: false, mileage, voltage, at: new Date() }), { lat, lng, speed: 0, state: "stop" });
    await delay(3000);
  }

  // Resume moderate drive 30 km/h
  for (let i = 8; i < waypoints.length; i++) {
    const [lat, lng] = waypoints[i];
    const speed = 28 + Math.random() * 6;
    heading = (heading + 6) % 360;
    mileage += speed / 3600 * 3;
    send("NRM", buildNrm({ lat, lng, speed, heading, ignition: true, mileage, voltage, at: new Date() }), { lat, lng, speed });
    await delay(3000);
  }

  // Emergency near last point
  const [eLat, eLng] = waypoints[waypoints.length - 1];
  send("EPB", buildEmergency({ lat: eLat, lng: eLng, speed: 12, heading }), { event: "emergency" });
  await delay(1000);
  send("NRM", buildNrm({ lat: eLat, lng: eLng, speed: 10, heading, ignition: true, mileage, voltage, at: new Date() }), { lat: eLat, lng: eLng, speed: 10 });

  // Closing health ping
  await delay(2000);
  send("HEALTH", buildHealth());

  console.log("Simulation completed. Socket will close.");
  socket.end();
}

stream().catch((err) => {
  console.error("Simulator error:", err);
  process.exit(1);
});
