const net = require("net");

const TCP_HOST = "127.0.0.1";
const TCP_PORT = 6000;

/* ------------------------------------------------------------------ */
/* 📝 USER CONFIGURATION (ENTER REAL DATA HERE)                        */
/* ------------------------------------------------------------------ */
const IMEI = "123456789012345"; // REPLACE WITH REAL IMEI
const VEHICLE_NO = "TS09ER1234"; // REPLACE WITH REAL VEHICLE NO
const SOFTWARE_VERSION = "2.5AIS"; // OPTIONAL

// Start Location (Hyderabad approx)
// We will move the vehicle from this point
let currentLat = 17.44008;
let currentLng = 78.348916;
const SPEED_KMPH = 45.5;
const HEADING = 45.0; // Moving North-East

/* ------------------------------------------------------------------ */
/* 🛠️ HELPERS                                                          */
/* ------------------------------------------------------------------ */

// Convert Decimal Degrees  to NMEA DDMM.MMMM format
// Example: 17.44 -> 1726.4000
function toNMEA(deg) {
  const d = Math.floor(deg);
  const m = (deg - d) * 60;
  return (d * 100 + m).toFixed(4);
}

function calculateChecksum(packetBody) {
  let xor = 0;
  for (let i = 0; i < packetBody.length; i++) {
    xor ^= packetBody.charCodeAt(i);
  }
  return xor.toString(16).toUpperCase().padStart(2, "0");
}

/* ------------------------------------------------------------------ */
/* 📦 PACKET BUILDERS                                                  */
/* ------------------------------------------------------------------ */

function createLoginPacket() {
  // $LGN,VEHICLE_NO,IMEI,VERSION
  return `$LGN,${VEHICLE_NO},${IMEI},${SOFTWARE_VERSION}\n`;
}

function createLocationPacket() {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear().toString().slice(-2);
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  const gpsDate = `${d}${m}20${y}`;
  const gpsTime = `${h}${min}${s}`;

  // Simulate Movement: Add small increment
  currentLat += 0.0001; // Moving North
  currentLng += 0.0001; // Moving East

  // Convert to NMEA
  const nmeaLat = toNMEA(currentLat);
  const nmeaLng = toNMEA(currentLng);

  // Status Field (Table 8 / Packet Status)
  // "000100" -> 4th char '1' means Ignition ON
  const statusField = "000100";

  // $NRM Packet Structure (Matching Server Controller)
  // $NRM,IMEI,Date,Time,Lat,LatDir,Long,LongDir,Speed,Heading,Sats,Alt,PDOP,HDOP,NetOp,Ignition,Mileage,...
  const parts = [
    "NRM",
    IMEI,
    gpsDate,
    gpsTime,
    nmeaLat,
    "N",
    nmeaLng,
    "E",
    SPEED_KMPH, // Speed
    HEADING, // Heading
    "10", // Satellites
    "500", // Altitude
    "1.0", // PDOP
    "1.0", // HDOP
    "Airtel", // Operator
    "404", // MCC (ignored by parseNR but placeholder)
    statusField, // Status/Ignition
    "10500", // Mileage
    "12.5", // Main Power
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
  console.log("✅ Connected!");

  // 1. Send Login
  const login = createLoginPacket();
  console.log(`📤 Sending LOGIN: ${login.trim()}`);
  client.write(login);

  // 2. Start Simulation Loop
  console.log("🚗 Starting Vehicle Simulation...");

  setInterval(() => {
    const loc = createLocationPacket();
    console.log(
      `📤 Sending LOCATION: Lat: ${currentLat.toFixed(6)}, Lng: ${currentLng.toFixed(6)}`,
    );
    // console.log(`   Packet: ${loc.trim()}`); // Uncomment to see raw packet
    client.write(loc);
  }, 3000); // Update every 3 seconds
});

client.on("data", (data) => {
  console.log(`📩 Server: ${data.toString().trim()}`);
});

client.on("close", () => {
  console.log("❌ Connection closed");
  process.exit();
});

client.on("error", (err) => {
  console.error("⚠️ Error:", err.message);
  process.exit(1);
});
