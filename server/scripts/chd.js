const net = require("net");

const TCP_HOST = "127.0.0.1";
const TCP_PORT = 6000;

/* ------------------------------------------------------------------ */
/* 📝 USER CONFIGURATION                                               */
/* ------------------------------------------------------------------ */
const IMEI = "123456789012345";
const VEHICLE_NO = "TS09ER1234";
const SOFTWARE_VERSION = "2.5AIS";

/* ------------------------------------------------------------------ */
/* 📍 CLEAN CHANDIGARH ROUTE (Sector 17 → Sector 43 ISBT)               */
/* ------------------------------------------------------------------ */

// Precise waypoints for major roads
const WAYPOINTS = [
  { lat: 30.741482, lng: 76.768066 }, // Start: Sector 17 ISBT
  { lat: 30.735, lng: 76.762 }, // 17/18 Chowk
  { lat: 30.725, lng: 76.752 }, // Aroma Chowk (Sector 22)
  { lat: 30.715, lng: 76.742 }, // Sector 35/43 Chowk
  { lat: 30.704649, lng: 76.717873 }, // End: Sector 43 ISBT
];

const TOTAL_DURATION_SEC = 240; // 4 minutes
const INTERVAL_MS = 1000; // 1 second update

let totalSteps = TOTAL_DURATION_SEC;
let stepsPerSegment = Math.floor(totalSteps / (WAYPOINTS.length - 1));

/* ------------------------------------------------------------------ */
/* 🛠️ HELPERS                                                          */
/* ------------------------------------------------------------------ */

function toNMEA(deg) {
  const d = Math.floor(Math.abs(deg));
  const m = (Math.abs(deg) - d) * 60;
  return (d * 100 + m).toFixed(4);
}

function calculateChecksum(packetBody) {
  let xor = 0;
  for (let i = 0; i < packetBody.length; i++) {
    xor ^= packetBody.charCodeAt(i);
  }
  return xor.toString(16).toUpperCase().padStart(2, "0");
}

function calculateHeading(lat1, lon1, lat2, lon2) {
  const y =
    Math.sin(((lon2 - lon1) * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

/* ------------------------------------------------------------------ */
/* 📦 PACKETS                                                          */
/* ------------------------------------------------------------------ */

function createLoginPacket() {
  return `$LGN,${VEHICLE_NO},${IMEI},${SOFTWARE_VERSION}\n`;
}

function createLocationPacket(step) {
  const date = new Date();

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear().toString().slice(-2);
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  const gpsDate = `${d}${m}20${y}`;
  const gpsTime = `${h}${min}${s}`;

  // Interpolation logic (Clean, no jitter)
  const segmentIndex = Math.min(
    Math.floor(step / stepsPerSegment),
    WAYPOINTS.length - 2,
  );
  const p1 = WAYPOINTS[segmentIndex];
  const p2 = WAYPOINTS[segmentIndex + 1];
  const t = (step % stepsPerSegment) / stepsPerSegment;

  let lat = p1.lat + (p2.lat - p1.lat) * t;
  let lng = p1.lng + (p2.lng - p1.lng) * t;

  const nmeaLat = toNMEA(lat);
  const nmeaLng = toNMEA(lng);

  const speed = 35.0; // Constant speed for testing
  const heading = calculateHeading(p1.lat, p1.lng, p2.lat, p2.lng).toFixed(1);
  const statusField = "100100"; // Running

  const parts = [
    "NRM",
    IMEI,
    gpsDate,
    gpsTime,
    nmeaLat,
    "N",
    nmeaLng,
    "E",
    speed.toFixed(1),
    heading,
    "9",
    "320",
    "1.1",
    "0.9",
    "Airtel",
    "404",
    statusField,
    "15000",
    "12.6",
  ];

  const body = parts.join(",");
  const checksum = calculateChecksum(body);

  return `$${body}*${checksum}\n`;
}

/* ------------------------------------------------------------------ */
/* 🚀 EXECUTION                                                        */
/* ------------------------------------------------------------------ */

const client = new net.Socket();

console.log(`🔌 Connecting to ${TCP_HOST}:${TCP_PORT}...`);

client.connect(TCP_PORT, TCP_HOST, () => {
  console.log("✅ Connected");

  const login = createLoginPacket();
  console.log("📤 LOGIN SENT");
  client.write(login);

  console.log("🚗 Clean Simulation Started (4 Minutes)");

  let step = 0;
  const timer = setInterval(() => {
    if (step > totalSteps) {
      console.log("🏁 Route completed");
      clearInterval(timer);
      client.end();
      return;
    }

    const packet = createLocationPacket(step);

    if (step % 10 === 0) {
      console.log(`📍 Step ${step}/${totalSteps} | Moving properly...`);
    }

    client.write(packet);
    step++;
  }, INTERVAL_MS);
});

client.on("data", () => {}); // Silent

client.on("close", () => {
  console.log("❌ Connection closed");
  process.exit();
});

client.on("error", (err) => {
  console.error("⚠️ Error:", err.message);
  process.exit(1);
});
