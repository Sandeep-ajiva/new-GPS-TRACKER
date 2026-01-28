/**
 * test_process_gps.js (v2 – production-accurate)
 */

require("dotenv").config();
const mongoose = require("mongoose");
const redis = require("redis");

// ===================== MODELS =====================
const Organization = require("../Modules/organizations/model");
const User = require("../Modules/users/model");
const Vehicle = require("../Modules/vehicle/model");
const GpsDevice = require("../Modules/gpsDevice/model");
const VehicleDeviceMapping = require("../Modules/vehicleMapping/model");
const GpsLiveData = require("../Modules/gpsLiveData/model");
const GpsHistory = require("../Modules/gpsHistory/model");
const VehicleDailyStats = require("../Modules/vehicleDailyStats/model");

// ===================== SERVICE =====================
const GpsService = require("../Modules/gpsLiveData/service");

// ===================== HELPERS =====================
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/gps_tracker';
  console.log("Connecting to MongoDB...", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");

  // ===================== REDIS =====================
  const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  const redisClient = redis.createClient({ url: REDIS_URL });
  redisClient.on("error", console.error);
  await redisClient.connect();

  // ===================== CLEANUP =====================
  await Promise.all([
    Organization.deleteMany({ name: "TEST-ORG" }),
    User.deleteMany({ email: "admin@test.com" }),
    Vehicle.deleteMany({ vehicleNumber: "TEST-VEH-001" }),
    GpsDevice.deleteMany({ imei: "TESTIMEI123456" }),
    VehicleDeviceMapping.deleteMany({}),
    GpsLiveData.deleteMany({}),
    GpsHistory.deleteMany({}),
    VehicleDailyStats.deleteMany({}),
  ]);

  // Use a dummy user id for createdBy fields to satisfy required refs
  const dummyUserId = new mongoose.Types.ObjectId();

  // ===================== CREATE ORG =====================
  const organization = await Organization.create({
    name: "TEST-ORG",
    organizationType: "logistics",
    email: "org@test.com",
    phone: "9999999999",
    address: { addressLine: "Test Address" },
    createdBy: dummyUserId,
  });

  console.log("Organization created:", organization._id.toString());

  // ===================== CREATE VEHICLE =====================
  const vehicle = await Vehicle.create({
    organizationId: organization._id,
    createdBy: dummyUserId,
    vehicleNumber: "TEST-VEH-001",
    vehicleType: "car",
    status: "active",
  });

  console.log("Vehicle created:", vehicle._id.toString());

  // ===================== CREATE GPS DEVICE =====================
  const device = await GpsDevice.create({
    organizationId: organization._id,
    imei: "TESTIMEI123456",
    status: "active",
  });

  console.log("GPS Device created:", device._id.toString());

  // ===================== CREATE MAPPING =====================
  await VehicleDeviceMapping.create({
    organizationId: organization._id,
    vehicleId: vehicle._id,
    gpsDeviceId: device._id,
    assignedAt: new Date(),
    unassignedAt: null,
  });

  console.log("Vehicle-device mapping created");

  // ===================== CLEAR REDIS CACHE =====================
  await redisClient.del(`device_meta:${device.imei}`);

  // ===================== CALL GPS SERVICE =====================
  console.log("Calling processGpsData()");

  const payload = {
    imei: device.imei,
    lat: "12.9716",
    lng: "77.5946",
    speed: "45",
    ignition: true,
    timestamp: new Date(),
  };

  let result;
  try {
    result = await GpsService.processGpsData(payload);
    console.log("Service result:", result);
  } catch (e) {
    console.error("processGpsData thrown error:", e && e.stack ? e.stack : e);
    throw e;
  }

  // ===================== WAIT FOR ASYNC =====================
  await sleep(1500);

  // ===================== VERIFY =====================
  const live = await GpsLiveData.findOne({ gpsDeviceId: device._id });
  const histories = await GpsHistory.find({ gpsDeviceId: device._id });
  const stats = await VehicleDailyStats.findOne({ vehicleId: vehicle._id });

  console.log("\n========= VERIFICATION =========");

  console.log("GpsLiveData:", live ? {
    lat: live.latitude,
    lng: live.longitude,
    speed: live.currentSpeed,
    ignition: live.ignitionStatus,
    lastIgnitionOn: live.lastIgnitionOn,
  } : null);

  console.log("GpsHistory count:", histories.length);
  console.log("VehicleDailyStats:", stats || null);

  // Simple assertions -> exit non-zero on failure so CI/tools notice
  if (!live) {
    console.error('ERROR: GpsLiveData record not found');
    process.exit(2);
  }
  if (!histories || histories.length === 0) {
    console.error('ERROR: No GpsHistory records created');
    process.exit(3);
  }

  // ===================== SHUTDOWN =====================
  await redisClient.disconnect();
  await mongoose.disconnect();

  console.log("\n✅ TEST COMPLETED SUCCESSFULLY");
  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Test script error:", err);
  process.exit(1);
});
