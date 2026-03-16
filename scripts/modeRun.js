const net = require("net");

// ╔══════════════════════════════════════════════════════════════════╗
// ║                     ★  MASTER CONFIG  ★                         ║
// ║         Only edit this block — everything else is automatic      ║
// ╚══════════════════════════════════════════════════════════════════╝
const CONFIG = {
    // ── Device Identity ─────────────────────────────────────────────
    IMEI: "123456789025833",
    VEHICLE_NO: "22AA5520",
    FIRMWARE: "2.5AIS",

    // ── Server ──────────────────────────────────────────────────────
    HOST: "127.0.0.1",
    PORT: 6000,

    // ── Route  (start → end, lat/lng) ───────────────────────────────
    START_LAT: 30.72676592785246,
    START_LNG: 76.76698255305155,
    END_LAT: 30.583376117925678,
    END_LNG: 77.01932070473283,

    // ── ORS Routing API ─────────────────────────────────────────────
    ORS_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=",

    // ── Odometer (starting value in km) ─────────────────────────────
    INITIAL_ODO: 23000,

    // ── Packet Timing (ms between packets) ──────────────────────────
    PACKET_DELAY_MOVING: 150,   // delay between moving packets
    PACKET_DELAY_IDLE: 120,   // delay between idle/stop packets

    // ── Trip Logic Thresholds ────────────────────────────────────────
    SPEED_MOVING_THRESHOLD: 5,     // km/h above which = "Running"
    SPEED_OVERSPEED: 85,    // km/h above which = Overspeed alert
    IGNITION_OFF_BUFFER: 5,     // minutes of IGN-OFF before trip finalises
    DATA_GAP_THRESHOLD: 5,     // minutes of no data = new trip

    // ── Phase Configuration ──────────────────────────────────────────
    //  Each phase fires in order during a trip. You can add/remove freely.
    //
    //  type:
    //    "pre_idle"   — engine ON, speed 0, AC settable  (before driving)
    //    "running"    — normal movement along route
    //    "overspeed"  — movement phase that exceeds speed limit
    //    "ac_off"     — movement with AC turned off
    //    "mid_idle"   — engine ON, speed 0, mid-trip stop
    //    "data_gap"   — simulates GPS blackout (no packets sent)
    //    "end_idle"   — engine ON, speed 0, after reaching destination
    //    "ignition_off" — engine OFF (finalises the trip)
    //
    //  packets  → how many packets to send for idle/stop/gap phases
    //  from/to  → 0.0–1.0 fraction of route coordinates to use
    //  speed    → km/h for running phases (ignored for idle phases)
    //  ac       → 1=on, 0=off
    //  gap_sec  → seconds of silence for data_gap phase
    PHASES: [
        { type: "pre_idle", packets: 5, speed: 0, ac: 1 },
        { type: "running", from: 0.00, to: 0.20, speed: 45, ac: 1 },
        { type: "overspeed", from: 0.20, to: 0.30, speed: 92, ac: 1 },
        { type: "running", from: 0.30, to: 0.45, speed: 50, ac: 1 },
        { type: "ac_off", from: 0.45, to: 0.55, speed: 40, ac: 0 },
        { type: "mid_idle", packets: 6, speed: 0, ac: 0 },
        { type: "data_gap", gap_sec: 360 },   // 6 min blackout → new trip
        { type: "running", from: 0.55, to: 0.80, speed: 55, ac: 1 },
        { type: "overspeed", from: 0.80, to: 0.88, speed: 95, ac: 1 },
        { type: "running", from: 0.88, to: 1.00, speed: 48, ac: 1 },
        { type: "end_idle", packets: 5, speed: 0, ac: 0 },
        { type: "ignition_off", packets: 3, speed: 0, ac: 0 },
    ],
};

// ════════════════════════════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════════════════════════════
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const pad2 = (v) => String(v).padStart(2, "0");
const log = (tag, msg, extra = "") => {
    const now = new Date().toTimeString().slice(0, 8);
    const tags = {
        INFO: "\x1b[36m[INFO ]\x1b[0m",
        PHASE: "\x1b[35m[PHASE]\x1b[0m",
        PKT: "\x1b[32m[PKT  ]\x1b[0m",
        WARN: "\x1b[33m[WARN ]\x1b[0m",
        ERR: "\x1b[31m[ERR  ]\x1b[0m",
        GAP: "\x1b[90m[GAP  ]\x1b[0m",
        DONE: "\x1b[32m[DONE ]\x1b[0m",
    };
    console.log(`${now} ${tags[tag] || "[    ]"} ${msg} ${extra ? "\x1b[90m" + extra + "\x1b[0m" : ""}`);
};

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
    return {
        v: (deg * 100 + min).toFixed(4),
        d: isLat ? (dec >= 0 ? "N" : "S") : dec >= 0 ? "E" : "W",
    };
};

const dtParts = (offsetSec = 0) => {
    const d = new Date(Date.now() + offsetSec * 1000);
    return {
        date: `${pad2(d.getDate())}${pad2(d.getMonth() + 1)}${pad2(d.getFullYear() % 100)}`,
        time: `${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`,
    };
};

const haversine = (a, b) => {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const bearing = (a, b) => {
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x =
        Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

// ════════════════════════════════════════════════════════════════════
//  PACKET BUILDERS
// ════════════════════════════════════════════════════════════════════
const loginPacket = () =>
    `$LGN,${CONFIG.VEHICLE_NO},${CONFIG.IMEI},${CONFIG.FIRMWARE}\n`;

function buildPacket({ lat, lng, speed, heading, ignition, ac, odo, offsetSec }) {
    const { date, time } = dtParts(offsetSec);
    const latN = toNmea(lat, true);
    const lngN = toNmea(lng, false);
    const status = `000${ignition}${ac}1`;

    const body = [
        "NRM",
        CONFIG.IMEI,
        date,
        time,
        latN.v,
        latN.d,
        lngN.v,
        lngN.d,
        speed.toFixed(1),
        heading.toFixed(1),
        "12",
        "250",
        "1.1",
        "0.8",
        "Simulator-Pro",
        "404",
        status,
        Math.floor(odo).toString(),
        "12.8",
    ].join(",");

    return withCS(body);
}

// ════════════════════════════════════════════════════════════════════
//  ROUTE FETCH
// ════════════════════════════════════════════════════════════════════
async function fetchRoute() {
    log("INFO", "Fetching route from ORS...");
    const res = await fetch(
        "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
        {
            method: "POST",
            headers: {
                Authorization: CONFIG.ORS_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                coordinates: [
                    [CONFIG.START_LNG, CONFIG.START_LAT],
                    [CONFIG.END_LNG, CONFIG.END_LAT],
                ],
            }),
        }
    );
    const data = await res.json();
    const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    log("INFO", `Route loaded: ${coords.length} waypoints`);
    return coords;
}

// ════════════════════════════════════════════════════════════════════
//  SLICE ROUTE BY FRACTION
// ════════════════════════════════════════════════════════════════════
function sliceRoute(coords, from, to) {
    const start = Math.floor(from * (coords.length - 1));
    const end = Math.ceil(to * (coords.length - 1));
    return coords.slice(start, end + 1);
}

// ════════════════════════════════════════════════════════════════════
//  SEND PACKETS
// ════════════════════════════════════════════════════════════════════
async function sendIdle(socket, point, count, { speed, ignition, ac, odo, offset }) {
    for (let i = 0; i < count; i++) {
        const pkt = buildPacket({ ...point, speed, heading: 0, ignition, ac, odo, offsetSec: offset.value });
        socket.write(pkt);
        log("PKT", `[IGN:${ignition} AC:${ac} SPD:0] ODO:${Math.floor(odo)}`, `t+${offset.value}s`);
        offset.value += 60;
        await delay(CONFIG.PACKET_DELAY_IDLE);
    }
}

async function sendMovement(socket, segCoords, { speed, ac, odo, offset }) {
    let localOdo = odo;
    for (let i = 0; i < segCoords.length; i++) {
        const pt = segCoords[i];
        const prev = i > 0 ? segCoords[i - 1] : pt;
        const hdg = i > 0 ? bearing(prev, pt) : 0;
        if (i > 0) localOdo += haversine(prev, pt);

        const pkt = buildPacket({
            ...pt,
            speed,
            heading: hdg,
            ignition: 1,
            ac,
            odo: localOdo,
            offsetSec: offset.value,
        });

        socket.write(pkt);

        const flag = speed > CONFIG.SPEED_OVERSPEED ? " ⚡OVERSPEED" : "";
        log("PKT", `[IGN:1 AC:${ac} SPD:${speed}${flag}] ODO:${Math.floor(localOdo)}`, `t+${offset.value}s`);

        offset.value += 30;
        await delay(CONFIG.PACKET_DELAY_MOVING);
    }
    return localOdo;
}

// ════════════════════════════════════════════════════════════════════
//  MAIN PHASE RUNNER
// ════════════════════════════════════════════════════════════════════
async function runPhases(socket, coords) {
    const offset = { value: 0 };
    let odo = CONFIG.INITIAL_ODO;

    // Track trip state for logging
    let tripCounter = 1;
    let tripStats = { running: 0, idle: 0, stop: 0, distance: 0 };

    for (const phase of CONFIG.PHASES) {
        log("PHASE", `▶ ${phase.type.toUpperCase()}`, JSON.stringify(
            phase.type === "data_gap"
                ? { gap_sec: phase.gap_sec }
                : phase.type === "running" || phase.type === "overspeed" || phase.type === "ac_off"
                    ? { from: phase.from, to: phase.to, speed: phase.speed, ac: phase.ac }
                    : { packets: phase.packets, ac: phase.ac }
        ));

        switch (phase.type) {

            // ── Engine ON, no movement ──────────────────────────────
            case "pre_idle":
                await sendIdle(socket, coords[0], phase.packets, {
                    speed: 0, ignition: 1, ac: phase.ac, odo, offset,
                });
                tripStats.idle += phase.packets * 60;
                break;

            // ── Normal movement ─────────────────────────────────────
            case "running": {
                const seg = sliceRoute(coords, phase.from, phase.to);
                const prevOdo = odo;
                odo = await sendMovement(socket, seg, { speed: phase.speed, ac: phase.ac, odo, offset });
                tripStats.running += (seg.length) * 30;
                tripStats.distance += odo - prevOdo;
                break;
            }

            // ── Overspeed movement ──────────────────────────────────
            case "overspeed": {
                log("WARN", `Overspeed zone: ${phase.speed} km/h (limit: ${CONFIG.SPEED_OVERSPEED} km/h)`);
                const seg = sliceRoute(coords, phase.from, phase.to);
                const prevOdo = odo;
                odo = await sendMovement(socket, seg, { speed: phase.speed, ac: phase.ac, odo, offset });
                tripStats.running += seg.length * 30;
                tripStats.distance += odo - prevOdo;
                break;
            }

            // ── Movement with AC off ─────────────────────────────────
            case "ac_off": {
                const seg = sliceRoute(coords, phase.from, phase.to);
                const prevOdo = odo;
                odo = await sendMovement(socket, seg, { speed: phase.speed, ac: 0, odo, offset });
                tripStats.running += seg.length * 30;
                tripStats.distance += odo - prevOdo;
                break;
            }

            // ── Mid-trip idle (engine on, parked) ───────────────────
            case "mid_idle": {
                const midIdx = Math.floor(coords.length * 0.5);
                await sendIdle(socket, coords[midIdx], phase.packets, {
                    speed: 0, ignition: 1, ac: phase.ac, odo, offset,
                });
                tripStats.idle += phase.packets * 60;
                break;
            }

            // ── Data gap: no packets → triggers new trip on server ──
            case "data_gap": {
                const gapMs = phase.gap_sec * 1000;
                log("GAP", `Data blackout for ${phase.gap_sec}s — server will split trip here`);
                offset.value += phase.gap_sec;

                // Print trip summary before gap
                printTripSummary(tripCounter, tripStats);
                tripCounter++;
                tripStats = { running: 0, idle: 0, stop: 0, distance: 0 };

                await delay(Math.min(gapMs, 2000)); // cap wait to 2s in sim
                log("GAP", "Signal restored — starting new trip");
                break;
            }

            // ── End idle (engine on, at destination) ────────────────
            case "end_idle": {
                const lastPt = coords[coords.length - 1];
                await sendIdle(socket, lastPt, phase.packets, {
                    speed: 0, ignition: 1, ac: phase.ac, odo, offset,
                });
                tripStats.idle += phase.packets * 60;
                break;
            }

            // ── Ignition OFF (closes the trip) ──────────────────────
            case "ignition_off": {
                const lastPt = coords[coords.length - 1];
                await sendIdle(socket, lastPt, phase.packets, {
                    speed: 0, ignition: 0, ac: 0, odo, offset,
                });
                tripStats.stop += phase.packets * 60;

                printTripSummary(tripCounter, tripStats);
                break;
            }

            default:
                log("WARN", `Unknown phase type: "${phase.type}" — skipped`);
        }
    }
}

// ════════════════════════════════════════════════════════════════════
//  TRIP SUMMARY LOGGER
// ════════════════════════════════════════════════════════════════════
function printTripSummary(tripNo, stats) {
    const fmt = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;
    console.log("\n\x1b[36m" + "─".repeat(55) + "\x1b[0m");
    console.log(`\x1b[36m  TRIP ${tripNo} SUMMARY\x1b[0m`);
    console.log("\x1b[36m" + "─".repeat(55) + "\x1b[0m");
    console.log(`  📍 Distance   : \x1b[32m${stats.distance.toFixed(2)} km\x1b[0m`);
    console.log(`  🟢 Running    : \x1b[32m${fmt(stats.running)}\x1b[0m  (speed > ${CONFIG.SPEED_MOVING_THRESHOLD} km/h)`);
    console.log(`  🟠 Idle       : \x1b[33m${fmt(stats.idle)}\x1b[0m  (engine ON, speed 0)`);
    console.log(`  🔴 Stop       : \x1b[31m${fmt(stats.stop)}\x1b[0m  (engine OFF)`);
    console.log("\x1b[36m" + "─".repeat(55) + "\x1b[0m\n");
}

// ════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════════════════════════
async function run() {
    let coords;
    try {
        coords = await fetchRoute();
    } catch (e) {
        log("ERR", "Route fetch failed:", e.message);
        process.exit(1);
    }

    const socket = net.createConnection(
        { host: CONFIG.HOST, port: CONFIG.PORT },
        async () => {
            log("INFO", `Connected to ${CONFIG.HOST}:${CONFIG.PORT}`);
            log("INFO", `Vehicle: ${CONFIG.VEHICLE_NO}  IMEI: ${CONFIG.IMEI}`);

            socket.write(loginPacket());
            log("INFO", "Login packet sent");

            try {
                await runPhases(socket, coords);
                log("DONE", "All phases complete — simulation finished ✓");
            } catch (err) {
                log("ERR", "Phase error:", err.message);
            }

            socket.end();
        }
    );

    socket.on("data", (d) => log("INFO", "Server:", d.toString().trim()));
    socket.on("error", (e) => log("ERR", "Socket error:", e.message));
    socket.on("close", () => log("INFO", "Connection closed"));
}

run();