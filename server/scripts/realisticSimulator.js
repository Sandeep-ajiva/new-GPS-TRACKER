const net = require("net");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose = require("mongoose");
const DeviceMapping = require("../Modules/deviceMapping/model");
// Register referenced models used by populate() in this standalone script.
require("../Modules/gpsDevice/model");
require("../Modules/vehicle/model");

const {
    buildLoginPacket,
    buildHealthPacket,
    buildAlertPacket,
    buildEmergencyPacket,
    buildOtaPacket,
    buildActivationPacket,
    calculateChecksum,
    buildGpsDateTimeParts,
} = require("./tcpPacketBuilders");

// Environment variables for Host and Port
const HOST = process.env.TCP_HOST || "127.0.0.1";
const PORT = process.env.TCP_PORT || 6000;
const MONGO_URI = process.env.MONGO_URI;

// Helper for waiting
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// Convert coordinates to NMEA format expected by NRM packet
function toNmeaCoordinate(decimal, isLat) {
    const abs = Math.abs(Number(decimal));
    const degrees = Math.floor(abs);
    const minutes = (abs - degrees) * 60;
    const ddmm = degrees * 100 + minutes;

    return {
        value: ddmm.toFixed(4),
        direction: isLat ? (decimal >= 0 ? "N" : "S") : (decimal >= 0 ? "E" : "W"),
    };
}

// Custom NRM Builder with extended telemetry fields used by dashboard
function buildCustomNrm({
    imei,
    lat,
    lng,
    speed,
    heading = 90,
    numberOfSatellites = 9,
    altitude = 320,
    pdop = 1.1,
    hdop = 0.9,
    operatorName = "Simulator",
    mcc = "404",
    ignition,
    ac,
    mainPower,
    currentMileage,
    mainInputVoltage,
    internalBatteryVoltage,
    batteryLevel,
    gsmSignalStrength,
    fuelPercentage,
    temperature,
    date,
}) {
    const { gpsDate, gpsTime } = buildGpsDateTimeParts(date);
    const latNmea = toNmeaCoordinate(lat, true);
    const lngNmea = toNmeaCoordinate(lng, false);

    // Status field:
    // charAt(3): ignition, charAt(4): AC, charAt(5): main power
    const ignChar = ignition ? "1" : "0";
    const acChar = ac ? "1" : "0";
    const powerChar = mainPower ? "1" : "0";
    const statusField = `000${ignChar}${acChar}${powerChar}`;

    const body = [
        "NRM",
        imei,
        gpsDate,
        gpsTime,
        latNmea.value,
        latNmea.direction,
        lngNmea.value,
        lngNmea.direction,
        Number(speed).toFixed(1),
        Number(heading).toFixed(1),
        String(Math.round(numberOfSatellites)),
        String(Number(altitude)),
        String(Number(pdop)),
        String(Number(hdop)),
        operatorName,
        mcc,
        statusField,
        Number(currentMileage).toFixed(2),
        Number(mainInputVoltage).toFixed(2),
        Number(internalBatteryVoltage).toFixed(2),
        String(Math.round(batteryLevel)),
        String(Math.round(gsmSignalStrength)),
        String(Math.round(fuelPercentage)),
        String(temperature),
    ].join(",");

    const checksum = calculateChecksum(body);
    return `$${body}*${checksum}\n`;
}

async function discoverActiveMappedDevice() {
    const mapping = await DeviceMapping.findOne({ unassignedAt: null })
        .populate("gpsDeviceId", "imei softwareVersion status vehicleRegistrationNumber")
        .populate("vehicleId", "vehicleNumber")
        .sort({ assignedAt: -1 })
        .lean();

    if (!mapping) {
        throw new Error("No active mapped device found in the database. Please ensure a device is mapped to a vehicle.");
    }

    const gps = mapping.gpsDeviceId;
    const vehicle = mapping.vehicleId;

    if (!gps || !gps.imei || gps.status !== "active") {
        throw new Error("Found mapping but GPS device is inactive or missing IMEI.");
    }

    return {
        IMEI: gps.imei,
        VEHICLE_NO: gps.vehicleRegistrationNumber || (vehicle ? vehicle.vehicleNumber : "UNKNOWN"),
        SOFTWARE_VERSION: gps.softwareVersion || "2.5AIS"
    };
}

async function runSimulator() {
    let socket = null;
    try {
        console.log(`🔌 Connecting to MongoDB...`);
        if (!MONGO_URI) {
            throw new Error("MONGO_URI is not defined in .env file");
        }
        await mongoose.connect(MONGO_URI);
        console.log(`✅ Connected to MongoDB.`);

        const device = await discoverActiveMappedDevice();
        console.log(`\n🎯 Selected Device from Database:`);
        console.log(`   IMEI            : ${device.IMEI}`);
        console.log(`   Vehicle Number  : ${device.VEHICLE_NO}`);
        console.log(`   Software Version: ${device.SOFTWARE_VERSION}\n`);

        const { IMEI, VEHICLE_NO, SOFTWARE_VERSION } = device;

        socket = new net.Socket();
        socket.setNoDelay(true);
        socket.setKeepAlive(true, 60000);

        console.log(`📡 Connecting to TCP Backend at ${HOST}:${PORT} ...`);
        await new Promise((resolve, reject) => {
            socket.connect(PORT, HOST, () => {
                console.log(`✅ Connected successfully!\n`);
                resolve();
            });
            socket.on("error", reject);
        });

        socket.on("data", (data) => {
            // Hidden: Acks coming from server
        });

        // Start coordinates
        let currentLat = 30.7408;
        let currentLng = 76.7676;
        let currentMileage = 15000;
        let fuelPercentage = 78;
        let temperatureC = 29;
        let batteryPercentage = 91;
        let mainInputVoltage = 12.8;
        let internalBatteryVoltage = 4.2;
        let gsmSignalStrength = 23;

        // Custom Logger
        const sendPacket = (type, packetData, info = {}) => {
            const {
                speed = 0,
                ignition = false,
                ac = false,
                mainPower = false,
                fuel = null,
                temp = null,
            } = info;

            if (socket && !socket.destroyed) {
                socket.write(packetData);
            }
            const timeStr = new Date().toISOString().substring(11, 19);
            console.log(
                `[${timeStr}] [${type.padEnd(8)}] Speed:${String(speed).padStart(3)} | IGN:${ignition ? "ON " : "OFF"} | AC:${ac ? "ON " : "OFF"} | PW:${mainPower ? "ON " : "OFF"} | Fuel:${fuel == null ? "NA" : String(fuel).padStart(2)}% | Temp:${temp == null ? "NA" : temp} | Lat:${currentLat.toFixed(5)} | Lng:${currentLng.toFixed(5)}`
            );
        };

        // ============================================
        // 1. INITIAL SEQUENCE
        // ============================================

        // 1) immediately start with LOGIN
        const loginPacket = buildLoginPacket({ imei: IMEI, vehicleNo: VEHICLE_NO, softwareVersion: SOFTWARE_VERSION });
        sendPacket("LOGIN", loginPacket);

        // 2) After 2 sec -> $ACT
        await delay(2000);
        const actPacket = buildActivationPacket({ imei: IMEI, status: "ON", details: "Simulator ACT" });
        sendPacket("ACT", actPacket);

        // 3) After 2 sec -> $OTA
        await delay(2000);
        const otaPacket = buildOtaPacket({ imei: IMEI, status: "SUCCESS", fromVersion: SOFTWARE_VERSION, toVersion: "2.6AIS", details: "OTA Done" });
        sendPacket("OTA", otaPacket);

        // 4) After 3 sec -> HEALTH
        await delay(3000);
        const healthPacket = buildHealthPacket({ imei: IMEI, softwareVersion: SOFTWARE_VERSION, batteryPercentage: 90 });
        sendPacket("HEALTH", healthPacket);

        // ============================================
        // 2. STATE FLOW & 2-MINUTE TRACKING
        // ============================================
        console.log(`\n🚀 Starting 2 minutes live tracking sequence...\n`);

        // 120 seconds duration sequence
        for (let t = 0; t <= 120; t++) {
            let speed = 0;
            let ignition = false;
            let ac = false;
            let mainPower = false;
            let heading = 0;
            let satellites = 6;

            // Determine State based on timeline
            if (t <= 30) {
                ignition = true; speed = 42; ac = true; mainPower = true; heading = 75; satellites = 11; // RUNNING
            } else if (t <= 50) {
                ignition = true; speed = 0; ac = true; mainPower = true; heading = 0; satellites = 9; // IDLE
            } else if (t <= 90) {
                ignition = true; speed = 92; ac = true; mainPower = true; heading = 80; satellites = 12; // RUNNING + overspeed
            } else {
                ignition = false; speed = 0; ac = false; mainPower = false; heading = 0; satellites = 7; // INACTIVE
            }

            // Simulate changing telemetry values
            if (ignition && speed > 0) {
                currentMileage += speed / 3600;
                fuelPercentage = clamp(fuelPercentage - 0.04, 0, 100);
                temperatureC = clamp(temperatureC + 0.05, 20, 90);
                mainInputVoltage = clamp(mainInputVoltage - 0.001, 11.8, 13.2);
            } else if (ignition) {
                fuelPercentage = clamp(fuelPercentage - 0.01, 0, 100);
                temperatureC = clamp(temperatureC + 0.01, 20, 90);
                mainInputVoltage = clamp(mainInputVoltage - 0.0005, 11.5, 13.2);
            } else {
                temperatureC = clamp(temperatureC - 0.08, 20, 90);
                mainInputVoltage = clamp(mainInputVoltage - 0.03, 0, 13.2);
                if (mainInputVoltage < 9.5) {
                    mainInputVoltage = 0;
                }
            }

            batteryPercentage = clamp(
                batteryPercentage - (ignition ? 0.015 : 0.03),
                5,
                100,
            );
            internalBatteryVoltage = clamp(3.5 + (batteryPercentage / 100) * 0.9, 3.5, 4.4);
            gsmSignalStrength = clamp(
                gsmSignalStrength + (Math.random() > 0.5 ? 1 : -1),
                12,
                30,
            );

            // Force low battery window for alert testing
            if (t >= 88 && t <= 95) {
                batteryPercentage = 15;
                internalBatteryVoltage = 3.58;
            }

            // Triggers for specific timers
            if (t === 20) {
                // Sent at 20s - explicit OVERSPEED alert
                const overspeedPacket = buildAlertPacket({
                    imei: IMEI, alertIdentifier: "overspeed", latitude: currentLat, longitude: currentLng,
                    speed: 95, severity: "warning", message: "Overspeed triggered"
                });
                sendPacket("ALERT", overspeedPacket, { speed: 95, ignition, ac, mainPower, fuel: Math.round(fuelPercentage), temp: `${Math.round(temperatureC)}C` });
            }

            if (t === 70) {
                // Sent at 70s - EMERGENCY
                const emergencyPacket = buildEmergencyPacket({
                    imei: IMEI, state: "ON", latitude: currentLat, longitude: currentLng, speed: speed
                });
                sendPacket("EMERGNCY", emergencyPacket, { speed, ignition, ac, mainPower, fuel: Math.round(fuelPercentage), temp: `${Math.round(temperatureC)}C` });
            }

            if (t === 90) {
                // Sent at 90s - LOW BATTERY alert
                const lowBatteryPacket = buildAlertPacket({
                    imei: IMEI, alertIdentifier: "low_battery", latitude: currentLat, longitude: currentLng,
                    speed: speed, severity: "critical", message: "Low Battery"
                });
                sendPacket("ALERT", lowBatteryPacket, { speed, ignition, ac, mainPower, fuel: Math.round(fuelPercentage), temp: `${Math.round(temperatureC)}C` });
            }

            if (t === 110) {
                // Sent at 110s - FINAL HEALTH packet
                const finalHealthPacket = buildHealthPacket({
                    imei: IMEI,
                    softwareVersion: SOFTWARE_VERSION,
                    batteryPercentage: Math.round(batteryPercentage),
                });
                sendPacket("HEALTH", finalHealthPacket, { speed, ignition, ac, mainPower, fuel: Math.round(fuelPercentage), temp: `${Math.round(temperatureC)}C` });
            }

            // Live Tracking NRM every 5 seconds
            if (t % 5 === 0) {
                const nrmPacket = buildCustomNrm({
                    imei: IMEI, lat: currentLat, lng: currentLng, speed: speed,
                    heading,
                    numberOfSatellites: satellites,
                    ignition,
                    ac,
                    mainPower,
                    currentMileage,
                    mainInputVoltage,
                    internalBatteryVoltage,
                    batteryLevel: batteryPercentage,
                    gsmSignalStrength,
                    fuelPercentage,
                    temperature: `${Math.round(temperatureC)}C`,
                    date: new Date(),
                });
                sendPacket("NRM", nrmPacket, {
                    speed,
                    ignition,
                    ac,
                    mainPower,
                    fuel: Math.round(fuelPercentage),
                    temp: `${Math.round(temperatureC)}C`,
                });
            }

            // Simulate vehicle movement
            if (speed > 0) {
                currentLat += 0.00015; // Move latitude
                currentLng += 0.00020; // Move longitude
            }

            // 1 real-world second = 1 second in our timeline
            await delay(1000);
        }

        console.log(`\n🛑 Two minutes completed.`);

    } catch (err) {
        console.error(`\n❌ Error in Simulation Flow:`, err);
    } finally {
        if (socket && !socket.destroyed) {
            socket.destroy();
        }
        await mongoose.connection.close();
        console.log(`🔌 MongoDB connection closed.`);
        process.exit(0);
    }
}

// Fire simulator
runSimulator();
