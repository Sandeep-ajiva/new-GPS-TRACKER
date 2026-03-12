
const net = require("net");

// ==========================================
// DEVICE CONFIG
// ==========================================
const IMEI = "123456789025800";
const VEHICLE_NO = "DL20E4750";

// Slightly larger route for realistic analytics
const START_LAT = 30.978500;
const START_LNG = 76.910200;
const END_LAT = 30.992506;
const END_LNG = 76.897093;

// TCP SERVER
const HOST = "127.0.0.1";
const PORT = 6000;

// ORS ROUTE API
const ORS_KEY = process.env.ORS_API_KEY ||
  "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=";
// packet interval
const PACKET_DELAY = 1000;
const SAMPLE_EVERY_M = 50;

// ==========================================

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

  return {
    v: ddmm.toFixed(4),
    d: isLat
      ? dec >= 0
        ? "N"
        : "S"
      : dec >= 0
        ? "E"
        : "W",
  };
};

const dtParts = () => {
  const d = new Date();
  return {
    date: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(
      d.getFullYear() % 100
    )}`,
    time: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(
      d.getSeconds()
    )}`,
  };
};

const loginPacket = () => `$LGN,${VEHICLE_NO},${IMEI},2.5AIS\n`;

const nrmPacket = ({
  lat,
  lng,
  speed,
  heading,
  ignition,
  ac = 0,
}) => {
  const { date, time } = dtParts();

  const latN = toNmea(lat, true);
  const lngN = toNmea(lng, false);

  // bit pattern:
  // ignition bit + AC bit
  const status = ignition
    ? ac
      ? "000110"
      : "000100"
    : "000000";

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

const haversine = (a, b) => {
  const R = 6371000;

  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) *
    Math.cos(la2) *
    Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const resample = (coords) => {
  if (coords.length <= 2) return coords.map(([lng, lat]) => ({ lat, lng }));

  const pts = coords.map(([lng, lat]) => ({ lat, lng }));

  const out = [pts[0]];
  let acc = 0;

  for (let i = 1; i < pts.length; i++) {
    const d = haversine(pts[i - 1], pts[i]);
    acc += d;

    if (acc >= SAMPLE_EVERY_M || i === pts.length - 1) {
      out.push(pts[i]);
      acc = 0;
    }
  }

  return out;
};

async function fetchRoute() {
  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: ORS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [START_LNG, START_LAT],
          [END_LNG, END_LAT],
        ],
        radiuses: [3000, 3000],
      }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    console.error("ORS API Error:", res.status, data);
    throw new Error(`ORS API Error: ${res.status}`);
  }

  if (!data.features || data.features.length === 0) {
    console.error("No features found in ORS response:", data);
    throw new Error("No features found in ORS response");
  }

  return resample(data.features[0].geometry.coordinates);
}

function phaseForIndex(i) {
  if (i < 10)
    return { speed: 20, ignition: 1, ac: 0 }; // trip start

  if (i < 30)
    return { speed: 45, ignition: 1, ac: 0 }; // running

  if (i < 40)
    return { speed: 0, ignition: 1, ac: 0 }; // idle

  if (i < 50)
    return { speed: 82, ignition: 1, ac: 0 }; // overspeed

  if (i < 60)
    return { speed: 35, ignition: 1, ac: 1 }; // AC ON

  return { speed: 0, ignition: 0, ac: 0 }; // trip end
}

async function run() {
  console.log("Fetching route...");

  const coords = await fetchRoute();

  const socket = net.createConnection(
    { host: HOST, port: PORT },
    async () => {
      console.log("Connected");

      socket.write(loginPacket());

      await delay(1000);

      for (let i = 0; i < coords.length; i++) {
        const curr = coords[i];
        const prev = coords[Math.max(0, i - 1)];

        const heading =
          Math.atan2(
            curr.lng - prev.lng,
            curr.lat - prev.lat
          ) *
          (180 / Math.PI) +
          180;

        const phase = phaseForIndex(i);

        socket.write(
          nrmPacket({
            lat: curr.lat,
            lng: curr.lng,
            speed: phase.speed,
            heading: heading || 0,
            ignition: phase.ignition,
            ac: phase.ac,
          })
        );

        console.log(
          `#${i} speed=${phase.speed} ignition=${phase.ignition} ac=${phase.ac}`
        );

        await delay(PACKET_DELAY);
      }

      console.log("Simulation complete");

      socket.end();
    }
  );

  socket.on("data", (d) =>
    console.log("ACK:", d.toString().trim())
  );

  socket.on("error", (e) =>
    console.error("Socket error:", e.message)
  );
}

run();

