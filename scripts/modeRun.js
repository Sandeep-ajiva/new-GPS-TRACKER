const net = require("net");

// ╔══════════════════════════════════════════════════════════════════════════╗
// ║              ★  PRODUCTION GPS SIMULATOR  v3.1  ★                       ║
// ║                                                                          ║
// ║  KEY FIX: Dense GPS points so playback follows the road exactly.        ║
// ║  Each movement packet = 5 simulated seconds (was 30s).                  ║
// ║  At 55 km/h this gives ~75m between points — tight road-following.      ║
// ║                                                                          ║
// ║  REALISTIC FEATURES:                                                    ║
// ║  • GPS jitter ±2.5m per packet                                          ║
// ║  • Speed jitter ±3 km/h + gradual accel/decel                          ║
// ║  • Fuel burn (moving + idle), battery voltage, GSM, satellites          ║
// ║  • Engine temperature rise/cool                                         ║
// ║  • Heading smoothed max 30° per packet                                  ║
// ║  • Emergency packet (1-in-300), tamper alert (1-in-500)                ║
// ╚══════════════════════════════════════════════════════════════════════════╝

const CONFIG = {
  // ── Device Identity ────────────────────────────────────────────────────
  IMEI:       "123456789025866",
  VEHICLE_NO: "PB-07-5587",
  FIRMWARE:   "2.5AIS",

  // ── Server ─────────────────────────────────────────────────────────────
  HOST: "127.0.0.1",
  PORT: 6000,

  // ── Route ──────────────────────────────────────────────────────────────
  START_LAT: 31.876682270219934,
  START_LNG: 76.32116313557898,
  END_LAT:  32.09053601224302, 
  END_LNG:   76.26168665899554,
   

  // ── ORS API key ────────────────────────────────────────────────────────
  ORS_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImNiYWM1NmMxNGY2NDQ2ZTFhYzc5YWQ2NjU1ZGM5NjU3IiwiaCI6Im11cm11cjY0In0=",

  // ── Odometer ────────────────────────────────────────────────────────────
  INITIAL_ODO: 23000,

  // ── Packet timing ──────────────────────────────────────────────────────
  // Keep actual delays short for smooth animation in UI.
  // SIMULATED_SECONDS_PER_MOVING_PACKET = 5  → ~75m gap at 55 km/h
  // (old value was 30 → ~460m gap per point = off-road straight lines)
  PACKET_DELAY_MOVING:             150,   // ms — real wall clock delay
  PACKET_DELAY_IDLE:               800,   // ms
  SIMULATED_SECONDS_PER_MOVING_PKT:  5,   // ← KEY: dense points = road-following playback
  SIMULATED_SECONDS_PER_IDLE_PKT:   60,   // idle packets still 60s apart

  // ── Speed / alert thresholds ────────────────────────────────────────────
  SPEED_LIMIT:             80,
  SPEED_MOVING_THRESHOLD:   5,

  // ── Sensor configuration ────────────────────────────────────────────────
  SENSOR: {
    FUEL_START_PERCENT:       78,
    FUEL_BURN_PER_KM:      0.010,
    FUEL_IDLE_BURN_PER_SEC: 0.0003,

    VOLTAGE_ENGINE_OFF_MIN: 11.9,
    VOLTAGE_ENGINE_OFF_MAX: 12.4,
    VOLTAGE_ENGINE_ON_MIN:  13.8,
    VOLTAGE_ENGINE_ON_MAX:  14.4,

    GSM_BASE:    19,
    GSM_JITTER:   2,

    SAT_MIN:  8,
    SAT_MAX: 14,

    TEMP_AMBIENT:       28,
    TEMP_RUNNING_MAX:   92,
    TEMP_RISE_PER_SEC:  0.08,
    TEMP_COOL_PER_SEC:  0.05,
  },

  GPS_JITTER_METERS: 2.5,

  // ── Phases ──────────────────────────────────────────────────────────────
  PHASES: [
    { type: "pre_idle",     packets: 4,                         ac: 1 },
    { type: "running",      from: 0.00, to: 0.20, speed: 45,   ac: 1 },
    { type: "overspeed",    from: 0.20, to: 0.30, speed: 92,   ac: 1 },
    { type: "running",      from: 0.30, to: 0.45, speed: 50,   ac: 1 },
    { type: "ac_off",       from: 0.45, to: 0.55, speed: 40,   ac: 0 },
    { type: "mid_idle",     packets: 5,                         ac: 0 },
    { type: "data_gap",     gap_sec: 360 },
    { type: "running",      from: 0.55, to: 0.80, speed: 55,   ac: 1 },
    { type: "overspeed",    from: 0.80, to: 0.88, speed: 95,   ac: 1 },
    { type: "running",      from: 0.88, to: 1.00, speed: 48,   ac: 1 },
    { type: "end_idle",     packets: 4,                         ac: 0 },
    { type: "ignition_off", packets: 3,                         ac: 0 },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
//  LIVE STATE
// ════════════════════════════════════════════════════════════════════════════
const STATE = {
  fuel:           CONFIG.SENSOR.FUEL_START_PERCENT,
  batteryVoltage: CONFIG.SENSOR.VOLTAGE_ENGINE_OFF_MAX,
  gsmSignal:      CONFIG.SENSOR.GSM_BASE,
  satellites:     CONFIG.SENSOR.SAT_MIN + 3,
  temperature:    CONFIG.SENSOR.TEMP_AMBIENT,
  heading:        0,
  currentSpeed:   0,
  totalKm:        0,
  packetsSent:    0,
  emergencyFired: false,
  tamperFired:    false,
};

// ════════════════════════════════════════════════════════════════════════════
//  UTILITIES
// ════════════════════════════════════════════════════════════════════════════
const delay   = (ms)        => new Promise((r) => setTimeout(r, ms));
const pad2    = (v)         => String(v).padStart(2, "0");
const clamp   = (v, mn, mx) => Math.min(Math.max(v, mn), mx);
const rand    = (mn, mx)    => mn + Math.random() * (mx - mn);
const randInt = (mn, mx)    => Math.floor(rand(mn, mx + 1));

const COLORS = {
  INFO:   "\x1b[36m[INFO ]\x1b[0m",
  PHASE:  "\x1b[35m[PHASE]\x1b[0m",
  PKT:    "\x1b[32m[PKT  ]\x1b[0m",
  WARN:   "\x1b[33m[WARN ]\x1b[0m",
  ERR:    "\x1b[31m[ERR  ]\x1b[0m",
  GAP:    "\x1b[90m[GAP  ]\x1b[0m",
  DONE:   "\x1b[32m[DONE ]\x1b[0m",
  ALERT:  "\x1b[41m[ALERT]\x1b[0m",
  SENSOR: "\x1b[34m[SENS ]\x1b[0m",
};
const log = (tag, msg, extra = "") => {
  const ts = new Date().toTimeString().slice(0, 8);
  console.log(
    `${ts} ${COLORS[tag] || "[    ]"} ${msg}` +
    `${extra ? "  \x1b[90m" + extra + "\x1b[0m" : ""}`
  );
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

const bearingBetween = (a, b) => {
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1  = (a.lat * Math.PI) / 180;
  const lat2  = (b.lat * Math.PI) / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

// Smooth heading — max 30° per packet, prevents sudden direction flips
function smoothHeading(current, target) {
  let diff = target - current;
  if (diff >  180) diff -= 360;
  if (diff < -180) diff += 360;
  return (current + clamp(diff, -30, 30) + 360) % 360;
}

// GPS noise: ±2.5m position jitter
function addGpsJitter(lat, lng) {
  const R = 6371000;
  const j = CONFIG.GPS_JITTER_METERS;
  const dLat = (rand(-j, j) / R) * (180 / Math.PI);
  const dLng = (rand(-j, j) / R) * (180 / Math.PI) / Math.cos((lat * Math.PI) / 180);
  return { lat: lat + dLat, lng: lng + dLng };
}

// Realistic speed: gradual accel/decel + ±3 km/h jitter
function realisticSpeed(targetSpeed, prevSpeed) {
  if (targetSpeed === 0) return Math.max(0, prevSpeed - rand(4, 8));
  const accel = prevSpeed < targetSpeed
    ? Math.min(prevSpeed + rand(3, 6), targetSpeed)
    : Math.max(prevSpeed - rand(2, 5), targetSpeed);
  return Math.max(0, parseFloat((accel + rand(-3, 3)).toFixed(1)));
}

// ════════════════════════════════════════════════════════════════════════════
//  ROUTE DENSIFICATION
//  Interpolates additional waypoints between sparse ORS coordinates so that
//  packets are sent at consistent ~MAX_POINT_SPACING_KM intervals.
//  This ensures the GPS trail follows the road at any speed.
// ════════════════════════════════════════════════════════════════════════════
const MAX_POINT_SPACING_KM = 0.05; // 50m max between consecutive route points

function densifyRoute(coords) {
  const dense = [];
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    dense.push(a);

    const dist = haversine(a, b);
    if (dist > MAX_POINT_SPACING_KM) {
      const steps = Math.ceil(dist / MAX_POINT_SPACING_KM);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        dense.push({
          lat: a.lat + (b.lat - a.lat) * t,
          lng: a.lng + (b.lng - a.lng) * t,
        });
      }
    }
  }
  dense.push(coords[coords.length - 1]);
  return dense;
}

// ════════════════════════════════════════════════════════════════════════════
//  SENSOR UPDATE
// ════════════════════════════════════════════════════════════════════════════
function updateSensors(ignition, speed, distanceKm, elapsedSec) {
  const S = CONFIG.SENSOR;
  STATE.packetsSent++;

  // Fuel
  if (ignition) {
    if (speed > CONFIG.SPEED_MOVING_THRESHOLD) {
      STATE.fuel = Math.max(0, STATE.fuel - S.FUEL_BURN_PER_KM * distanceKm);
    } else {
      STATE.fuel = Math.max(0, STATE.fuel - S.FUEL_IDLE_BURN_PER_SEC * elapsedSec);
    }
  }

  // Battery
  if (ignition) {
    STATE.batteryVoltage = clamp(
      STATE.batteryVoltage + rand(0.005, 0.02),
      S.VOLTAGE_ENGINE_ON_MIN, S.VOLTAGE_ENGINE_ON_MAX,
    );
  } else {
    STATE.batteryVoltage = clamp(
      STATE.batteryVoltage - rand(0.003, 0.012),
      S.VOLTAGE_ENGINE_OFF_MIN, S.VOLTAGE_ENGINE_OFF_MAX,
    );
  }

  // GSM signal
  STATE.gsmSignal = clamp(
    STATE.gsmSignal + randInt(-S.GSM_JITTER, S.GSM_JITTER),
    6, 31,
  );

  // Satellites — drift every 5 packets
  if (STATE.packetsSent % 5 === 0) {
    STATE.satellites = clamp(STATE.satellites + randInt(-1, 1), S.SAT_MIN, S.SAT_MAX);
  }

  // Engine temperature
  if (ignition && speed > CONFIG.SPEED_MOVING_THRESHOLD) {
    STATE.temperature = clamp(
      STATE.temperature + S.TEMP_RISE_PER_SEC * elapsedSec,
      S.TEMP_AMBIENT, S.TEMP_RUNNING_MAX,
    );
  } else if (!ignition) {
    STATE.temperature = clamp(
      STATE.temperature - S.TEMP_COOL_PER_SEC * elapsedSec,
      S.TEMP_AMBIENT, S.TEMP_RUNNING_MAX,
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  PACKET BUILDER
// ════════════════════════════════════════════════════════════════════════════
function buildPacket({
  lat, lng, speed, heading, ignition, ac,
  odo, offsetSec,
  emergency = false, tamper = false,
  distanceKm = 0, elapsedSec = 5,
}) {
  const pos = addGpsJitter(lat, lng);
  STATE.heading      = smoothHeading(STATE.heading, heading);
  STATE.currentSpeed = realisticSpeed(speed, STATE.currentSpeed);
  updateSensors(ignition, STATE.currentSpeed, distanceKm, elapsedSec);

  const { date, time } = dtParts(offsetSec);
  const latN = toNmea(pos.lat, true);
  const lngN = toNmea(pos.lng, false);
  const status = `000${ignition ? 1 : 0}${ac ? 1 : 0}1`;
  const packetType = emergency ? "EA" : tamper ? "TA" : "NR";
  const internalBat = clamp(STATE.batteryVoltage - rand(0.08, 0.25), 3.6, 4.2);
  const mainPower   = ignition ? 1 : (Math.random() > 0.02 ? 1 : 0);

  const body = [
    "NRM",
    CONFIG.IMEI,
    date,
    time,
    latN.v, latN.d,
    lngN.v, lngN.d,
    STATE.currentSpeed.toFixed(1),
    STATE.heading.toFixed(1),
    String(STATE.satellites),
    "250",
    STATE.batteryVoltage.toFixed(1),
    internalBat.toFixed(1),
    "Simulator-Pro",
    "404",
    status,
    Math.floor(odo).toString(),
    STATE.fuel.toFixed(1),
    String(STATE.gsmSignal),
    packetType,
    String(Math.round(STATE.temperature)),
    mainPower ? "1" : "0",
    tamper ? "T" : "C",
  ].join(",");

  return withCS(body);
}

const loginPacket = () =>
  `$LGN,${CONFIG.VEHICLE_NO},${CONFIG.IMEI},${CONFIG.FIRMWARE}\n`;

// ════════════════════════════════════════════════════════════════════════════
//  ROUTE FETCH
// ════════════════════════════════════════════════════════════════════════════
async function fetchRoute() {
  log("INFO", "Fetching road-snapped route from OpenRouteService...");
  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: { Authorization: CONFIG.ORS_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [CONFIG.START_LNG, CONFIG.START_LAT],
          [CONFIG.END_LNG,   CONFIG.END_LAT],
        ],
      }),
    }
  );
  if (!res.ok) throw new Error(`ORS HTTP ${res.status}`);
  const data   = await res.json();
  const sparse = data.features[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));

  // Densify so no consecutive points are >50m apart
  const dense = densifyRoute(sparse);
  log("INFO", `Route: ${sparse.length} ORS waypoints → ${dense.length} densified points (max ${MAX_POINT_SPACING_KM * 1000}m spacing)`);
  return dense;
}

function sliceRoute(coords, from, to) {
  const start = Math.floor(from * (coords.length - 1));
  const end   = Math.ceil(to   * (coords.length - 1));
  return coords.slice(start, end + 1);
}

// ════════════════════════════════════════════════════════════════════════════
//  SEND IDLE PACKETS
// ════════════════════════════════════════════════════════════════════════════
async function sendIdle(socket, point, count, { ignition, ac, odo, offset }) {
  for (let i = 0; i < count; i++) {
    const pkt = buildPacket({
      ...point, speed: 0, heading: STATE.heading,
      ignition, ac, odo, offsetSec: offset.value,
      elapsedSec: CONFIG.SIMULATED_SECONDS_PER_IDLE_PKT,
    });
    socket.write(pkt);

    const lowBat = STATE.batteryVoltage < 12.3 ? "  \x1b[31m⚠LOW BAT\x1b[0m" : "";
    log("PKT",
      `IGN:${ignition ? "ON " : "OFF"} AC:${ac ? "ON " : "OFF"} SPD:  0km/h` +
      `  BAT:${STATE.batteryVoltage.toFixed(2)}V${lowBat}` +
      `  FUEL:${STATE.fuel.toFixed(1)}%` +
      `  TMP:${Math.round(STATE.temperature)}°C` +
      `  GSM:${STATE.gsmSignal} SAT:${STATE.satellites}`,
      `t+${offset.value}s`
    );

    offset.value += CONFIG.SIMULATED_SECONDS_PER_IDLE_PKT;
    await delay(CONFIG.PACKET_DELAY_IDLE);
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  SEND MOVEMENT PACKETS
//  Each packet advances simulated time by SIMULATED_SECONDS_PER_MOVING_PKT (5s).
//  Dense route points + 5s intervals = vehicle stays on road during playback.
// ════════════════════════════════════════════════════════════════════════════
async function sendMovement(socket, segCoords, { targetSpeed, ac, odo, offset }) {
  let localOdo = odo;

  for (let i = 0; i < segCoords.length; i++) {
    const pt     = segCoords[i];
    const prev   = i > 0 ? segCoords[i - 1] : pt;
    const rawHdg = i > 0 ? bearingBetween(prev, pt) : STATE.heading;
    let distKm   = 0;

    if (i > 0) {
      distKm         = haversine(prev, pt);
      localOdo      += distKm;
      STATE.totalKm += distKm;
    }

    // Emergency: 1-in-300, fires once
    const isEmergency = !STATE.emergencyFired && Math.random() < (1 / 300);
    if (isEmergency) {
      STATE.emergencyFired = true;
      log("ALERT", "🚨 EMERGENCY packet fired!");
    }

    // Tamper: 1-in-500, fires once
    const isTamper = !STATE.tamperFired && Math.random() < (1 / 500);
    if (isTamper) {
      STATE.tamperFired = true;
      log("ALERT", "⚠️  TAMPER packet fired!");
    }

    const pkt = buildPacket({
      ...pt, speed: targetSpeed, heading: rawHdg,
      ignition: true, ac, odo: localOdo,
      offsetSec: offset.value,
      emergency: isEmergency, tamper: isTamper,
      distanceKm: distKm,
      elapsedSec: CONFIG.SIMULATED_SECONDS_PER_MOVING_PKT,
    });
    socket.write(pkt);

    const overFlag = STATE.currentSpeed > CONFIG.SPEED_LIMIT
      ? "  \x1b[31m⚡OVERSPD\x1b[0m"
      : "";

    log("PKT",
      `IGN:ON  AC:${ac ? "ON " : "OFF"} SPD:${String(Math.round(STATE.currentSpeed)).padStart(3)}km/h${overFlag}` +
      `  BAT:${STATE.batteryVoltage.toFixed(2)}V` +
      `  FUEL:${STATE.fuel.toFixed(1)}%` +
      `  TMP:${Math.round(STATE.temperature)}°C` +
      `  GSM:${STATE.gsmSignal} SAT:${STATE.satellites}` +
      `  ODO:${Math.floor(localOdo)}`,
      `t+${offset.value}s`
    );

    offset.value += CONFIG.SIMULATED_SECONDS_PER_MOVING_PKT;
    await delay(CONFIG.PACKET_DELAY_MOVING);
  }

  return localOdo;
}

// ════════════════════════════════════════════════════════════════════════════
//  PHASE RUNNER
// ════════════════════════════════════════════════════════════════════════════
function newTrip(startOdo) {
  return { runningSec: 0, idleSec: 0, stopSec: 0, distanceKm: 0, maxSpeed: 0, overspeedCount: 0, startOdo };
}

async function runPhases(socket, coords) {
  const offset = { value: 0 };
  let odo      = CONFIG.INITIAL_ODO;
  let tripNo   = 1;
  let trip     = newTrip(odo);

  for (const phase of CONFIG.PHASES) {
    const desc = phase.type === "data_gap"
      ? `gap=${phase.gap_sec}s`
      : (phase.from !== undefined)
        ? `route ${phase.from}→${phase.to}  spd=${phase.speed}  ac=${phase.ac}`
        : `packets=${phase.packets}  ac=${phase.ac ?? 0}`;
    log("PHASE", `▶ ${phase.type.toUpperCase()}`, desc);

    switch (phase.type) {

      case "pre_idle": {
        STATE.batteryVoltage = CONFIG.SENSOR.VOLTAGE_ENGINE_ON_MIN + rand(0, 0.2);
        await sendIdle(socket, coords[0], phase.packets, {
          ignition: true, ac: phase.ac ?? 0, odo, offset,
        });
        trip.idleSec += phase.packets * CONFIG.SIMULATED_SECONDS_PER_IDLE_PKT;
        break;
      }

      case "running": {
        const seg = sliceRoute(coords, phase.from, phase.to);
        const p0  = odo;
        odo = await sendMovement(socket, seg, { targetSpeed: phase.speed, ac: phase.ac ?? 1, odo, offset });
        trip.runningSec += seg.length * CONFIG.SIMULATED_SECONDS_PER_MOVING_PKT;
        trip.distanceKm += odo - p0;
        trip.maxSpeed    = Math.max(trip.maxSpeed, phase.speed);
        break;
      }

      case "overspeed": {
        log("WARN", `Overspeed zone: ${phase.speed} km/h  (limit ${CONFIG.SPEED_LIMIT} km/h)`);
        const seg = sliceRoute(coords, phase.from, phase.to);
        const p0  = odo;
        odo = await sendMovement(socket, seg, { targetSpeed: phase.speed, ac: phase.ac ?? 1, odo, offset });
        trip.runningSec   += seg.length * CONFIG.SIMULATED_SECONDS_PER_MOVING_PKT;
        trip.distanceKm   += odo - p0;
        trip.maxSpeed      = Math.max(trip.maxSpeed, phase.speed);
        trip.overspeedCount++;
        break;
      }

      case "ac_off": {
        const seg = sliceRoute(coords, phase.from, phase.to);
        const p0  = odo;
        odo = await sendMovement(socket, seg, { targetSpeed: phase.speed, ac: 0, odo, offset });
        trip.runningSec += seg.length * CONFIG.SIMULATED_SECONDS_PER_MOVING_PKT;
        trip.distanceKm += odo - p0;
        trip.maxSpeed    = Math.max(trip.maxSpeed, phase.speed);
        break;
      }

      case "mid_idle": {
        const midIdx = Math.floor(coords.length * 0.5);
        await sendIdle(socket, coords[midIdx], phase.packets, {
          ignition: true, ac: phase.ac ?? 0, odo, offset,
        });
        trip.idleSec += phase.packets * CONFIG.SIMULATED_SECONDS_PER_IDLE_PKT;
        break;
      }

      case "data_gap": {
        log("GAP", `${phase.gap_sec}s GPS blackout → server splits trip here`);
        printTripSummary(tripNo, trip, odo);
        tripNo++;
        trip = newTrip(odo);
        offset.value += phase.gap_sec;
        await delay(Math.min(phase.gap_sec * 8, 2000));
        log("GAP", "Signal restored — new trip starting");
        break;
      }

      case "end_idle": {
        const lastPt = coords[coords.length - 1];
        await sendIdle(socket, lastPt, phase.packets, {
          ignition: true, ac: phase.ac ?? 0, odo, offset,
        });
        trip.idleSec += phase.packets * CONFIG.SIMULATED_SECONDS_PER_IDLE_PKT;
        break;
      }

      case "ignition_off": {
        STATE.batteryVoltage = clamp(
          STATE.batteryVoltage - rand(1.2, 2.0),
          CONFIG.SENSOR.VOLTAGE_ENGINE_OFF_MIN,
          CONFIG.SENSOR.VOLTAGE_ENGINE_OFF_MAX,
        );
        const lastPt = coords[coords.length - 1];
        await sendIdle(socket, lastPt, phase.packets, {
          ignition: false, ac: 0, odo, offset,
        });
        trip.stopSec += phase.packets * CONFIG.SIMULATED_SECONDS_PER_IDLE_PKT;
        printTripSummary(tripNo, trip, odo);
        break;
      }

      default:
        log("WARN", `Unknown phase "${phase.type}" — skipped`);
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
//  TRIP SUMMARY
// ════════════════════════════════════════════════════════════════════════════
function printTripSummary(tripNo, trip, endOdo) {
  const fmt = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };
  const avg = trip.runningSec > 60
    ? (trip.distanceKm / (trip.runningSec / 3600)).toFixed(1)
    : "N/A";

  console.log("\n\x1b[36m" + "━".repeat(65) + "\x1b[0m");
  console.log(`\x1b[36m   TRIP ${tripNo} SUMMARY\x1b[0m`);
  console.log("\x1b[36m" + "━".repeat(65) + "\x1b[0m");
  console.log(`   📍 Distance       : \x1b[32m${trip.distanceKm.toFixed(2)} km\x1b[0m  (ODO ${Math.floor(trip.startOdo)} → ${Math.floor(endOdo)})`);
  console.log(`   🟢 Running time   : \x1b[32m${fmt(trip.runningSec)}\x1b[0m`);
  console.log(`   🟠 Idle time      : \x1b[33m${fmt(trip.idleSec)}\x1b[0m`);
  console.log(`   🔴 Stop time      : \x1b[31m${fmt(trip.stopSec)}\x1b[0m`);
  console.log(`   ⚡ Avg speed      : \x1b[36m${avg} km/h\x1b[0m`);
  console.log(`   🏎️  Max speed      : \x1b[36m${trip.maxSpeed} km/h\x1b[0m`);
  console.log(`   🚨 Overspeed hits : \x1b[${trip.overspeedCount > 0 ? "31" : "32"}m${trip.overspeedCount}\x1b[0m`);
  console.log(`   ⛽ Fuel remaining : \x1b[33m${STATE.fuel.toFixed(1)}%\x1b[0m`);
  console.log(`   🔋 Battery        : \x1b[34m${STATE.batteryVoltage.toFixed(2)} V\x1b[0m`);
  console.log(`   🌡️  Engine temp    : \x1b[34m${Math.round(STATE.temperature)} °C\x1b[0m`);
  console.log(`   📡 GSM            : \x1b[34m${STATE.gsmSignal}/31\x1b[0m`);
  console.log(`   🛰️  Satellites     : \x1b[34m${STATE.satellites}\x1b[0m`);
  console.log(`   📦 Packets sent   : \x1b[37m${STATE.packetsSent}\x1b[0m`);
  console.log("\x1b[36m" + "━".repeat(65) + "\x1b[0m\n");
}

// ════════════════════════════════════════════════════════════════════════════
//  ENTRY POINT
// ════════════════════════════════════════════════════════════════════════════
async function run() {
  console.log("\n\x1b[36m" + "═".repeat(65) + "\x1b[0m");
  console.log("\x1b[36m   GPS SIMULATOR v3.1  —  Production Mode\x1b[0m");
  console.log(`   Vehicle : ${CONFIG.VEHICLE_NO}    IMEI : ${CONFIG.IMEI}`);
  console.log(`   Server  : ${CONFIG.HOST}:${CONFIG.PORT}`);
  console.log(`   Sim interval (moving) : ${CONFIG.SIMULATED_SECONDS_PER_MOVING_PKT}s per packet`);
  console.log(`   Route point spacing   : max ${MAX_POINT_SPACING_KM * 1000}m`);
  console.log("\x1b[36m" + "═".repeat(65) + "\x1b[0m\n");

  let coords;
  try {
    coords = await fetchRoute();
  } catch (err) {
    log("ERR", "Route fetch failed:", err.message);
    process.exit(1);
  }

  log("SENSOR",
    `Init — Fuel:${STATE.fuel}%  ` +
    `Bat:${STATE.batteryVoltage.toFixed(2)}V  ` +
    `Temp:${STATE.temperature}°C  ` +
    `GSM:${STATE.gsmSignal}  SAT:${STATE.satellites}`
  );

  const socket = net.createConnection(
    { host: CONFIG.HOST, port: CONFIG.PORT },
    async () => {
      log("INFO", `TCP connected → ${CONFIG.HOST}:${CONFIG.PORT}`);
      socket.write(loginPacket());
      log("INFO", "Login sent");
      await delay(600);

      try {
        await runPhases(socket, coords);
        log("DONE", `Complete ✓  Total km: ${STATE.totalKm.toFixed(2)}  Packets: ${STATE.packetsSent}`);
      } catch (err) {
        log("ERR", "Error:", err.message);
        console.error(err);
      }
      socket.end();
    }
  );

  socket.on("data",  (d) => log("INFO",  `Server → ${d.toString().trim()}`));
  socket.on("error", (e) => log("ERR",   `Socket error: ${e.message}`));
  socket.on("close", ()  => log("INFO",  "Connection closed"));
}

run();