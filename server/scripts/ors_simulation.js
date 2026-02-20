const net = require("net");

/* ------------------------------------------------------------------ */
/* 📝 CONFIGURATION                                                    */
/* ------------------------------------------------------------------ */
const TCP_HOST = "127.0.0.1";
const TCP_PORT = 6000;
const IMEI = "123456789012345";
const VEHICLE_NO = "TS09ER1234";
const SOFTWARE_VERSION = "2.5AIS";

const ORS_API_KEY =
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=";

// Coordinates for the route (Start to End)
const START_COORD = [78.348916, 17.44008]; // [lng, lat]
const END_COORD = [78.45, 17.5];

const UPDATE_INTERVAL_MS = 2000; // Send update every 2 seconds
const SPEED_KMPH = 40.0;

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

function createLocationPacket(lat, lng, heading) {
  const date = new Date();
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear().toString().slice(-2);
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");

  const gpsDate = `${d}${m}20${y}`;
  const gpsTime = `${h}${min}${s}`;

  const nmeaLat = toNMEA(lat);
  const nmeaLng = toNMEA(lng);
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
    SPEED_KMPH.toFixed(1),
    heading.toFixed(1),
    "12", // Sats
    "320",
    "1.1",
    "0.9",
    "ORS_SIM",
    "404",
    statusField,
    "20000",
    "12.8",
  ];

  const body = parts.join(",");
  const checksum = calculateChecksum(body);
  return `$${body}*${checksum}\n`;
}

const { getRealisticRoute } = require("../openSource");

/* ------------------------------------------------------------------ */
/* 🚀 EXECUTION                                                        */
/* ------------------------------------------------------------------ */

async function startSimulation() {
  const routePoints = await getRealisticRoute(START_COORD, END_COORD);
  const tcpClient = new net.Socket();

  console.log(`🔌 Connecting to ${TCP_HOST}:${TCP_PORT}...`);

  tcpClient.connect(TCP_PORT, TCP_HOST, () => {
    console.log("✅ Connected to tracking server");

    const login = createLoginPacket();
    tcpClient.write(login);
    console.log("📤 Login sent");

    let currentIndex = 0;
    const simulationLoop = setInterval(() => {
      if (currentIndex >= routePoints.length) {
        console.log("🏁 Destination reached. Simulation ended.");
        clearInterval(simulationLoop);
        tcpClient.end();
        return;
      }

      const [lng, lat] = routePoints[currentIndex];
      let heading = 0;

      if (currentIndex < routePoints.length - 1) {
        const [nextLng, nextLat] = routePoints[currentIndex + 1];
        heading = calculateHeading(lat, lng, nextLat, nextLng);
      } else if (currentIndex > 0) {
        const [prevLng, prevLat] = routePoints[currentIndex - 1];
        heading = calculateHeading(prevLat, prevLng, lat, lng);
      }

      const packet = createLocationPacket(lat, lng, heading);
      tcpClient.write(packet);

      if (currentIndex % 10 === 0 || currentIndex === routePoints.length - 1) {
        console.log(
          `📍 Point ${currentIndex + 1}/${routePoints.length} | Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)} | Heading: ${heading.toFixed(1)}°`,
        );
      }

      currentIndex++;
    }, UPDATE_INTERVAL_MS);
  });

  tcpClient.on("error", (err) => {
    console.error("⚠️ TCP Error:", err.message);
    process.exit(1);
  });

  tcpClient.on("close", () => {
    console.log("❌ Connection closed");
    process.exit();
  });
}

startSimulation();
