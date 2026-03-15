const net = require("net");

// ==========================================
// 🔴 HARDCODE YOUR DEVICE DATA HERE 🔴
// ==========================================
const IMEI = "123456789025800";            // Enter your Device IMEI
const VEHICLE_NO = "DL20E4750";             // Enter your Vehicle Number
const START_LAT = 30.974156703293744;                 // Enter Starting Latitude
const START_LNG = 76.90570689686656;                 // Enter Starting Longitude
const END_LAT = 30.974304657843646;        // Enter Ending/Last Latitude
const END_LNG = 76.90573731073448;          // Enter Ending/Last Longitude


// Server settings
const HOST = "127.0.0.1";                   // TCP server host
const PORT = 6000;                          // TCP server port
// ==========================================

const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=";
const SAMPLE_EVERY_M = 80;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (v) => String(v).padStart(2, "0");
const checksum = (body) => {
    let x = 0; for (let i = 0; i < body.length; i++) x ^= body.charCodeAt(i);
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
        "NRM", IMEI, date, time, latN.v, latN.d, lngN.v, lngN.d,
        speed.toFixed(1), heading.toFixed(1), "10", "250", "1.2", "0.9",
        "Simulator", "404", status, "15000", "12.6",
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
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const resample = (coords) => {
    if (coords.length <= 2) return coords;
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
    const url = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
    const body = {
        coordinates: [
            [START_LNG, START_LAT],
            [END_LNG, END_LAT],
        ],
    };
    const res = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: ORS_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`ORS ${res.status}: ${txt.slice(0, 200)}`);
    }
    const data = await res.json();
    const coords = data.features?.[0]?.geometry?.coordinates;
    if (!coords || !coords.length) throw new Error("ORS returned empty geometry");
    return resample(coords);
}

async function run() {
    console.log("Fetching route from ORS...");
    let coords;
    try {
        coords = await fetchRoute();
    } catch (err) {
        console.error("Failed to fetch route, falling back to direct line:", err.message);
        coords = resample([
            [START_LNG, START_LAT],
            [END_LNG, END_LAT],
        ]);
    }

    const socket = net.createConnection({ host: HOST, port: PORT }, async () => {
        console.log(`Connected to ${HOST}:${PORT}`);
        socket.write(loginPacket());
        await delay(1000);

        for (let i = 0; i < coords.length; i++) {
            const { lat, lng } = coords[i];
            const prev = coords[Math.max(0, i - 1)];
            const heading = Math.atan2(lng - prev.lng, lat - prev.lat) * (180 / Math.PI) + 180;
            const speed = i === 0 ? 0 : i % 6 === 0 ? 0 : 42;
            const ignition = speed > 0 ? 1 : 0;

            socket.write(nrmPacket({ lat, lng, speed, heading: heading || 0, ignition }));
            console.log(`Sent lat:${lat.toFixed(6)} lng:${lng.toFixed(6)} speed:${speed}`);
            await delay(1000);
        }

        console.log("Route finished");
        socket.end();
    });

    socket.on("data", (d) => console.log("ACK:", d.toString().trim()));
    socket.on("error", (e) => console.error("Socket error:", e.message));
}

run().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});
