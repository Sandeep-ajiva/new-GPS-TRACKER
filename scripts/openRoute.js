const net = require("net");
const path = require("path");
try {
  require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
} catch (_) { }

const HOST = process.env.TCP_HOST || "127.0.0.1";
const PORT = Number(process.env.TCP_PORT || 6000);
const IMEI = "123456789025866"; // mapped IMEI
const VEHICLE_NO = process.env.SIM_VEHICLE || "PB-20-9876"; // optional
const ORS_KEY = process.env.ORS_API_KEY;

// Custom start/end (provided)
const START = [76.69127258955892, 30.70539884232405]; // [lng, lat]
const END = [76.78513656598908, 30.745971269062274]; // [lng, lat]

async function getRealRoute() {
  if (!ORS_KEY) {
    console.warn("ORS_API_KEY not set, using fallback points.");
    return [START, END];
  }
  try {
    const res = await fetch("https://api.openrouteservice.org/v2/directions/driving-car/geojson", {
      method: "POST",
      headers: {
        Authorization: ORS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ coordinates: [START, END] }),
    });
    if (!res.ok) throw new Error(`ORS HTTP ${res.status}`);
    const data = await res.json();
    return data.features[0].geometry.coordinates;
  } catch (err) {
    console.warn("ORS fetch failed, using fallback:", err.message || err);
    return [START, END];
  }
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (v) => String(v).padStart(2, "0");
const checksum = (body) => {
  let x = 0;
  for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
  return x.toString(16).toUpperCase().padStart(2, "0");
};
const withCS = (b) => `$${b}*${checksum(b)}\n`;
const toNmea = (dec, isLat) => {
  const abs = Math.abs(dec);
  const deg = Math.floor(abs);
  const min = (abs - deg) * 60;
  const ddmm = deg * 100 + min;
  return { v: ddmm.toFixed(4), d: isLat ? (dec >= 0 ? "N" : "S") : dec >= 0 ? "E" : "W" };
};
const dtParts = () => {
  const d = new Date();
  return {
    date: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`,
    time: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`,
  };
};

const loginPacket = () => `$LGN,${VEHICLE_NO},${IMEI},2.5AIS\n`;
const nrmPacket = ({ lat, lng, speed, heading, ignition }) => {
  const { date, time } = dtParts();
  const latN = toNmea(lat, true);
  const lngN = toNmea(lng, false);
  const status = ignition ? "000100" : "000000";
  const body = [
    "NRM",
    IMEI,
    date,
    time,
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
    "15000",
    "12.6",
  ].join(",");
  return withCS(body);
};
const altPacket = (type, lat, lng, speed, heading) =>
  `$ALT,${IMEI},${type},${lat.toFixed(6)},${lng.toFixed(6)},${speed.toFixed(1)},${heading.toFixed(1)},warn,\n`;

async function run(socket) {
  console.log("Fetching route...");
  const coords = await getRealRoute();
  let speedsPrev = 40;

  socket.write(loginPacket());
  await delay(1500);

  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    const speed = i % 10 === 0 ? 0 : i % 12 === 0 ? 85 : 40;
    const heading = i > 0 ? 90 + i * 5 : 90;
    const ignition = speed === 0 && i % 2 === 0 ? 0 : 1;

    if (speed > 80) socket.write(altPacket("overspeed", lat, lng, speed, heading));
    if (i > 0 && speedsPrev > 80 && speed < 30) socket.write(altPacket("harsh_brake", lat, lng, speed, heading));

    socket.write(nrmPacket({ lat, lng, speed, heading, ignition }));
    speedsPrev = speed;
    console.log(`Sent → lat:${lat} lng:${lng} speed:${speed} ign:${ignition}`);
    await delay(3000);
  }

  console.log("Route finished");
  socket.end();
}

const client = net.createConnection({ host: HOST, port: PORT }, async () => {
  console.log(`Connected to ${HOST}:${PORT}`);
  await run(client);
});
client.on("data", (d) => console.log("ACK:", d.toString().trim()));
client.on("error", (e) => console.error("Socket error:", e.message));
