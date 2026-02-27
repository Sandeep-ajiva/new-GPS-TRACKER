const net = require("net");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const DeviceMapping = require("../Modules/deviceMapping/model");
require("../Modules/gpsDevice/model");
require("../Modules/vehicle/model");

const {
  buildLoginPacket,
  buildHealthPacket,
  buildAlertPacket,
  buildActivationPacket,
  buildOtaPacket,
  calculateChecksum,
  buildGpsDateTimeParts,
} = require("./tcpPacketBuilders");

const HOST = process.env.TCP_HOST || "127.0.0.1";
const PORT = process.env.TCP_PORT || 6000;
const MONGO_URI = process.env.MONGO_URI;

const SIM_TIME = 300; // 5 minutes

function delay(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function getHeading(p1, p2) {
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// 📍 REAL ROUTE (Chandigarh → Mohali → Zirakpur demo)
const ROUTE = [
  { lat: 30.741482, lng: 76.768066 },
  { lat: 30.739834, lng: 76.770912 },
  { lat: 30.736102, lng: 76.774521 },
  { lat: 30.729611, lng: 76.776432 },
  { lat: 30.721912, lng: 76.779945 },
  { lat: 30.715981, lng: 76.782772 },
  { lat: 30.709221, lng: 76.785901 },
  { lat: 30.705432, lng: 76.788221 },
  { lat: 30.701211, lng: 76.790554 },
];

function getSpeed(t) {
  if (t < 40) return 0;
  if (t < 100) return 35 + Math.random() * 10;
  if (t < 160) return 70 + Math.random() * 25;
  if (t < 200) return 0;
  if (t < 260) return 80 + Math.random() * 15;
  return 0;
}

async function discoverDevice() {
  const mapping = await DeviceMapping.findOne({ unassignedAt: null })
    .populate("gpsDeviceId")
    .populate("vehicleId")
    .sort({ assignedAt: -1 })
    .lean();

  return {
    IMEI: mapping.gpsDeviceId.imei,
    VEHICLE_NO: mapping.gpsDeviceId.vehicleRegistrationNumber,
    SOFTWARE_VERSION: mapping.gpsDeviceId.softwareVersion || "2.5AIS",
  };
}

function buildNRM({
  imei, lat, lng, speed, heading, battery, fuel, gsm, ignition,
}) {
  const { gpsDate, gpsTime } = buildGpsDateTimeParts(new Date());

  const body = [
    "NRM",
    imei,
    gpsDate,
    gpsTime,
    lat,
    "N",
    lng,
    "E",
    speed.toFixed(1),
    heading.toFixed(1),
    "10",
    "320",
    "1.1",
    "0.9",
    "SIM",
    "404",
    ignition ? "000111" : "000000",
    "15000",
    "12.8",
    "4.1",
    battery,
    gsm,
    fuel,
    "30C",
  ].join(",");

  return `$${body}*${calculateChecksum(body)}\n`;
}

async function run() {
  await mongoose.connect(MONGO_URI);
  const device = await discoverDevice();

  const socket = new net.Socket();
  await new Promise((res) => socket.connect(PORT, HOST, res));

  const send = (name, data) => {
    socket.write(data);
    console.log(name);
  };

  send("LOGIN", buildLoginPacket({
    imei: device.IMEI,
    vehicleNo: device.VEHICLE_NO,
    softwareVersion: device.SOFTWARE_VERSION,
  }));

  await delay(2000);

  send("ACT", buildActivationPacket({ imei: device.IMEI }));
  await delay(2000);

  send("OTA", buildOtaPacket({
    imei: device.IMEI,
    fromVersion: device.SOFTWARE_VERSION,
    toVersion: "2.6AIS",
  }));

  let routeIndex = 0;
  let fuel = 80;
  let battery = 95;
  let gsm = 25;

  for (let t = 0; t < SIM_TIME; t++) {

    const speed = getSpeed(t);
    const ignition = speed > 0;

    if (speed > 0 && routeIndex < ROUTE.length - 1) {
      routeIndex++;
    }

    const point = ROUTE[routeIndex];
    const next = ROUTE[routeIndex + 1] || point;
    const heading = getHeading(point, next);

    fuel = clamp(fuel - 0.02, 0, 100);
    battery = clamp(battery - 0.01, 20, 100);

    if (t === 160) fuel = 90; // fuel refill

    if (routeIndex === 4) gsm = 5;
    else gsm = 25;

    if (t % 20 === 0 && speed > 90) {
      send("OVERSPEED", buildAlertPacket({
        imei: device.IMEI,
        alertIdentifier: "overspeed",
        latitude: point.lat,
        longitude: point.lng,
        speed,
      }));
    }

    if (t % 60 === 0) {
      send("HEALTH", buildHealthPacket({
        imei: device.IMEI,
        softwareVersion: device.SOFTWARE_VERSION,
        batteryPercentage: battery,
      }));
    }

    if (t % 5 === 0) {
      send("NRM", buildNRM({
        imei: device.IMEI,
        lat: point.lat,
        lng: point.lng,
        speed,
        heading,
        battery,
        fuel,
        gsm,
        ignition,
      }));
    }

    await delay(1000);
  }

  socket.destroy();
  mongoose.connection.close();
}

run();