/**
 * Realistic 3-minute TCP simulation for a single vehicle.
 * Run with: node scripts/realisticFullSimulation.js
 * Uses only built-in modules.
 */

const net = require("net");

// Editable identifiers
const IMEI = "124536587451265"; // 15-digit IMEI
const VEHICLE_NO = "239";

// TCP target
const HOST = "127.0.0.1";
const PORT = 6000;

// Helpers --------------------------------------------------------------
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (v) => String(v).padStart(2, "0");

function buildGpsDateTimeParts(date = new Date()) {
  const d = new Date(date);
  return {
    gpsDate: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`,
    gpsTime: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`,
  };
}

function toNmeaCoordinate(decimal, isLat) {
  const abs = Math.abs(Number(decimal));
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const ddmm = degrees * 100 + minutes;
  return {
    value: ddmm.toFixed(4),
    dir: isLat ? (decimal >= 0 ? "N" : "S") : decimal >= 0 ? "E" : "W",
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
  sats = 9,
  mileage = 15000,
  mainInputVoltage = 12.6,
  at = new Date(),
}) {
  const { gpsDate, gpsTime } = buildGpsDateTimeParts(at);
  const latN = toNmeaCoordinate(lat, true);
  const lngN = toNmeaCoordinate(lng, false);
  const status = ignition ? "000100" : "000000"; // charAt(3) ignition flag for parser
  const body = [
    "NRM",
    imei,
    gpsDate,
    gpsTime,
    latN.value,
    latN.dir,
    lngN.value,
    lngN.dir,
    speed.toFixed(1),
    heading.toFixed(1),
    String(sats),
    "250", // altitude
    "1.2", // pdop
    "0.9", // hdop
    "Simulator",
    "404",
    status,
    mileage.toFixed(1),
    mainInputVoltage.toFixed(2),
  ].join(",");
  return withChecksum(body);
}

function buildAlt({ imei, type, lat, lng, speed, heading }) {
  const latN = toNmeaCoordinate(lat, true);
  const lngN = toNmeaCoordinate(lng, false);
  return `$ALT,${imei},${type},${latN.value},${latN.dir},${lngN.value},${lngN.dir},${speed.toFixed(
    1,
  )},${heading.toFixed(1)},warning,\n`;
}

function buildEmergency({ imei, lat, lng, speed, heading }) {
  const latN = toNmeaCoordinate(lat, true);
  const lngN = toNmeaCoordinate(lng, false);
  return `$EPB,${imei},ON,${latN.value},${latN.dir},${lngN.value},${lngN.dir},${speed.toFixed(
    1,
  )},${heading.toFixed(1)}\n`;
}

function buildHealth({ imei, battery = 88, signal = 23 }) {
  return `$HLM,ROADRPA,2.5AIS,${imei},${battery},20,35,60,60,0000,${signal}\n`;
}

function logPacket(label, { speed, ignition, lat, lng }) {
  const t = new Date().toISOString().substring(11, 19);
  console.log(`[${t}] ${label.padEnd(10)} | spd:${speed?.toFixed?.(1) ?? "NA"} | ign:${ignition ? "ON " : "OFF"} | ${lat?.toFixed?.(5)},${lng?.toFixed?.(5)}`);
}

// Simulation -----------------------------------------------------------
async function main() {
  const socket = new net.Socket();
  socket.setNoDelay(true);
  socket.setKeepAlive(true, 60000);

  await new Promise((resolve, reject) => {
    socket.connect(PORT, HOST, resolve);
    socket.on("error", reject);
  });

  socket.on("data", (d) => console.log(`ACK: ${d.toString().trim()}`));
  socket.on("close", () => console.log("Socket closed."));

  let lat = 30.7333;
  let lng = 76.7794;
  let heading = 45;
  let mileage = 15000;

  const send = (label, raw, meta = {}) => {
    socket.write(raw);
    logPacket(label, { ...meta, lat, lng });
  };

  // PHASE 1 – Login ----------------------------------------------------
  console.log("Phase 1: Login");
  send("LOGIN", buildLogin({ imei: IMEI, vehicleNo: VEHICLE_NO }));
  await delay(5000);

  // Helper to update movement smoothly
  const moveStep = (dLat = 0.0001, dLng = 0.0001) => {
    lat += dLat;
    lng += dLng;
    heading = (heading + 7) % 360;
  };

  // PHASE 2 – Smooth Driving (60s) ------------------------------------
  console.log("Phase 2: Smooth driving");
  for (let t = 0; t < 60; t += 5) {
    moveStep(0.00012, 0.00010);
    const speed = 35 + Math.random() * 10;
    mileage += speed / 3600 * 5;
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed, heading, ignition: true, mileage }), {
      speed,
      ignition: true,
    });
    await delay(5000);
  }

  // PHASE 3 – Overspeed (20s) -----------------------------------------
  console.log("Phase 3: Overspeed");
  moveStep();
  let speed = 85;
  send("ALT-OS", buildAlt({ imei: IMEI, type: "overspeed", lat, lng, speed, heading }), {
    speed,
    ignition: true,
  });
  await delay(1000);
  for (let t = 0; t < 20; t += 5) {
    moveStep(0.00013, 0.00011);
    speed = 82 + Math.random() * 6;
    mileage += speed / 3600 * 5;
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed, heading, ignition: true, mileage }), {
      speed,
      ignition: true,
    });
    await delay(5000);
  }

  // PHASE 4 – Harsh Braking (10s) -------------------------------------
  console.log("Phase 4: Harsh braking");
  moveStep(0.00005, 0.00005);
  speed = 12;
  send("ALT-HB", buildAlt({ imei: IMEI, type: "harsh_braking", lat, lng, speed, heading }), {
    speed,
    ignition: true,
  });
  await delay(1000);
  for (let t = 0; t < 10; t += 2) {
    speed = Math.max(10, speed - 18);
    moveStep(0.00004, 0.00004);
    mileage += speed / 3600 * 2;
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed, heading, ignition: true, mileage }), {
      speed,
      ignition: true,
    });
    await delay(2000);
  }

  // PHASE 5 – Idle Stop (30s) -----------------------------------------
  console.log("Phase 5: Idle stop");
  for (let t = 0; t < 30; t += 5) {
    moveStep(0.00001, 0.00001);
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed: 0, heading, ignition: true, mileage }), {
      speed: 0,
      ignition: true,
    });
    await delay(5000);
  }

  // PHASE 6 – Ignition OFF (15s) --------------------------------------
  console.log("Phase 6: Ignition OFF");
  for (let t = 0; t < 15; t += 5) {
    moveStep(0.000005, 0.000005);
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed: 0, heading, ignition: false, mileage }), {
      speed: 0,
      ignition: false,
    });
    await delay(5000);
  }

  // PHASE 7 – Resume 25–35 km/h (30s) ---------------------------------
  console.log("Phase 7: Resume cruise");
  for (let t = 0; t < 30; t += 5) {
    moveStep(0.0001, 0.0001);
    speed = 25 + Math.random() * 10;
    mileage += speed / 3600 * 5;
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed, heading, ignition: true, mileage }), {
      speed,
      ignition: true,
    });
    await delay(5000);
  }

  // PHASE 8 – Emergency (10s) -----------------------------------------
  console.log("Phase 8: Emergency trigger");
  moveStep(0.00008, 0.00008);
  speed = 32;
  send("EPB", buildEmergency({ imei: IMEI, lat, lng, speed, heading }), {
    speed,
    ignition: true,
  });
  await delay(1000);
  for (let t = 0; t < 10; t += 2) {
    moveStep(0.00008, 0.00008);
    speed = 28 + Math.random() * 6;
    mileage += speed / 3600 * 2;
    send("NRM", buildNrm({ imei: IMEI, lat, lng, speed, heading, ignition: true, mileage }), {
      speed,
      ignition: true,
    });
    await delay(2000);
  }

  // PHASE 9 – Health Packet -------------------------------------------
  console.log("Phase 9: Health packet");
  send("HEALTH", buildHealth({ imei: IMEI, battery: 86, signal: 24 }), { ignition: true });

  await delay(1000);
  socket.end();
}

main().catch((err) => {
  console.error("Simulation error:", err);
  process.exit(1);
});
