const net = require("net");

/**
 * COMPREHENSIVE SIMULATION SCRIPT
 * Tests Travel Summary & Trip Summary with:
 * - Specific start/end points
 * - Ignition / AC status transitions
 * - High speed alerts (> 80 km/h)
 * - Mid-trip stoppage to split trips
 */

// ==========================================
// 🔴 DEVICE CONFIGURATION
// ==========================================
const IMEI = "123456789029700";
const VEHICLE_NO = "DL20E4444";
const START_LAT = 30.71146231529745;
const START_LNG = 76.78528127857643;
const END_LAT = 31.038894173966625;
const END_LNG = 76.38056523603541;

const HOST = "127.0.0.1";
const PORT = 6000;

const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=";
const SAMPLE_EVERY_M = 150; // Increased to keep packet count manageable but realistic

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

const dtParts = (offsetSec = 0) => {
    const d = new Date();
    d.setSeconds(d.getSeconds() + offsetSec);
    return {
        date: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`,
        time: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`,
    };
};

const loginPacket = () => `$LGN,${VEHICLE_NO},${IMEI},2.5AIS\n`;

const nrmPacket = ({ lat, lng, speed, heading, ignition, ac, odometer, offset }) => {
    const { date, time } = dtParts(offset);
    const latN = toNmea(lat, true);
    const lngN = toNmea(lng, false);

    // Status string: [Reserved(3 chars)][Ignition(1)][AC(1)][MainPower(1)]
    // Example: Ignition ON (1), AC ON (1), Main Power ON (1) -> 000111
    const igBit = ignition ? "1" : "0";
    const acBit = ac ? "1" : "0";
    const status = `000${igBit}${acBit}1`; // 000111 = everything on

    const body = [
        "NRM", IMEI, date, time, latN.v, latN.d, lngN.v, lngN.d,
        speed.toFixed(1), heading.toFixed(1), "12", "250", "1.1", "0.8",
        "Simulator-Pro", "404", status, Math.floor(odometer || 0).toString(), "12.8",
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
        throw new Error(`ORS error: ${res.status}`);
    }
    const data = await res.json();
    const coords = data.features?.[0]?.geometry?.coordinates;
    return resample(coords);
}

async function run() {
    console.log("🚀 Starting Comprehensive Simulation...");
    console.log(`📍 Vehicle: ${VEHICLE_NO} | IMEI: ${IMEI}`);

    let coords;
    try {
        coords = await fetchRoute();
        console.log(`✅ Route fetched: ${coords.length} points.`);
    } catch (err) {
        console.warn("⚠️ ORS failed, using fallback points.");
        coords = resample([[START_LNG, START_LAT], [END_LNG, END_LAT]]);
    }

    const socket = net.createConnection({ host: HOST, port: PORT }, async () => {
        console.log(`📡 Connected to TCP Server at ${HOST}:${PORT}`);
        socket.write(loginPacket());
        await delay(500);

        let totalOdometer = 23000.50; // Starting odometer
        let currentOffset = 0;

        for (let i = 0; i < coords.length; i++) {
            const pt = coords[i];
            const prev = i > 0 ? coords[i - 1] : pt;
            const dist = haversine(prev, pt);
            totalOdometer += (dist / 1000); // km

            // HEADING
            const deltaY = pt.lng - prev.lng;
            const deltaX = pt.lat - prev.lat;
            let heading = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            if (heading < 0) heading += 360;

            // DYNAMIC SPEED & STATUS LOGIC
            let speed = 45; // Default cruise
            let ignition = 1;
            let ac = 1;

            if (i === 0) {
                speed = 0; // Start stationary
            } else if (i === Math.floor(coords.length / 2)) {
                // MID TRIP STOP (Ignition OFF to test travel summary split)
                console.log("⏸️ Simulating mid-trip stoppage (Ignition OFF)...");
                for (let s = 0; s < 3; s++) {
                    socket.write(nrmPacket({ ...pt, speed: 0, heading, ignition: 0, ac: 0, odometer: totalOdometer, offset: currentOffset }));
                    currentOffset += 60; // Simulate 1 minute wait
                    await delay(100);
                }
                ignition = 1; // Restart after
                speed = 30;
            } else if (i > 5 && i < 10) {
                speed = 85; // OVERSPEED ALERT BURST
                console.log("⚠️ Overspeed phase...");
            } else if (i > 15 && i < 20) {
                ac = 0; // Test AC OFF phase
                speed = 55;
            }

            socket.write(nrmPacket({ ...pt, speed, heading, ignition, ac, odometer: totalOdometer, offset: currentOffset }));
            console.log(`📍 [${i}/${coords.length}] Lat: ${pt.lat.toFixed(5)} Lng: ${pt.lng.toFixed(5)} Speed: ${speed}km/h Odo: ${totalOdometer.toFixed(2)}`);

            currentOffset += 30; // 30 seconds between packets
            await delay(150); // Fast simulation
        }

        // END TRIP
        console.log("🏁 Destination reached. Closing session.");
        socket.write(nrmPacket({ ...coords[coords.length - 1], speed: 0, heading: 0, ignition: 0, ac: 0, odometer: totalOdometer, offset: currentOffset }));
        socket.end();
    });

    socket.on("error", (e) => console.error("❌ Socket Error:", e.message));
}

run().catch(console.error);
