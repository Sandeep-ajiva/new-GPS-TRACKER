/**
 * Full end-to-end simulator setup + 30-min live run (Chandigarh).
 *
 * What it does:
 * 1) Upserts required organization/admin/master records
 * 2) Upserts driver, vehicle, gps-device and both mappings
 * 3) Starts realistic live TCP simulation for 30 minutes
 *
 * Run:
 *   node scripts/fullChandigarh30MinSetup.js
 *
 * Optional args:
 *   --duration=1800 --interval=5 --host=127.0.0.1 --port=6000 --seed=42
 */

const path = require("path");
const { spawn } = require("child_process");
const bcrypt = require("bcryptjs");
const { mongoose } = require("../server/common/classes/Model");

require("dotenv").config({ path: path.resolve(__dirname, "../server/.env"), quiet: true });
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });

let User;
let Organization;
let Vehicle;
let Driver;
let GpsDevice;
let DeviceMapping;
let VehicleDriverMapping;
let GpsHistory;
let GpsLiveData;

const DATA = {
  organization: {
    name: "Simulation Org",
    email: "sim.org@ajiva.test",
    phone: "9876501001",
    organizationType: "fleet",
    geo: {
      lat: 30.7333,
      lng: 76.7794,
      timezone: "Asia/Kolkata",
    },
  },
  superadmin: {
    firstName: "Super",
    lastName: "Admin",
    email: "superadmin@gmail.com",
    mobile: "1234567890",
    password: "admin@123",
  },
  admin: {
    firstName: "Sim",
    lastName: "Admin",
    email: "sim.admin@ajiva.test",
    mobile: "9876500001",
    password: "Admin@123",
  },
  vehicleMain: {
    vehicleNumber: "TS09ER1234",
    vehicleType: "car",
    model: "SimCar",
    make: "Ajiva",
    color: "Blue",
    year: 2024,
    status: "inactive",
    runningStatus: "inactive",
  },
  vehicleRahul: {
    vehicleNumber: "TS09ER1238",
    vehicleType: "car",
    model: "SimCar",
    make: "Ajiva",
    color: "Black",
    year: 2024,
    status: "active",
    runningStatus: "inactive",
  },
  gpsMain: {
    imei: "123456789012345",
    softwareVersion: "2.5AIS",
    status: "active",
    connectionStatus: "offline",
  },
  driverMain: {
    firstName: "Ramesh",
    lastName: "Kumar",
    phone: "9876500002",
    email: "ramesh.kumar@ajiva.test",
    licenseNumber: "DL1234567890123",
    licenseExpiry: new Date("2028-12-31"),
    address: "Sector 17, Chandigarh",
    status: "active",
    availability: true,
  },
  driverRahul: {
    firstName: "Rahul",
    lastName: "Patel",
    phone: "9876500006",
    email: "rahul.patel@ajiva.test",
    licenseNumber: "DL5678901234567",
    licenseExpiry: new Date("2028-12-31"),
    address: "Sector 22, Chandigarh",
    status: "active",
    availability: true,
  },
};

function parseArgs(argv) {
  const out = {};
  argv.forEach((arg) => {
    if (!arg.startsWith("--")) return;
    const [k, ...rest] = arg.slice(2).split("=");
    out[k] = rest.length ? rest.join("=") : true;
  });
  return out;
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function loadModels() {
  User = require("../server/Modules/users/model");
  Organization = require("../server/Modules/organizations/model");
  Vehicle = require("../server/Modules/vehicle/model");
  Driver = require("../server/Modules/drivers/model");
  GpsDevice = require("../server/Modules/gpsDevice/model");
  DeviceMapping = require("../server/Modules/deviceMapping/model");
  VehicleDriverMapping = require("../server/Modules/vehicleDriverMapping/model");
  GpsHistory = require("../server/Modules/gpsHistory/model");
  GpsLiveData = require("../server/Modules/gpsLiveData/model");
}

async function upsertUser(userData, role, organizationId = null) {
  const passwordHash = await bcrypt.hash(userData.password, 10);
  let user = await User.findOne({ email: userData.email });
  if (!user) {
    user = await User.create({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      mobile: userData.mobile,
      passwordHash,
      role,
      status: "active",
      organizationId,
    });
    return user;
  }

  user.firstName = userData.firstName;
  user.lastName = userData.lastName;
  user.mobile = userData.mobile;
  user.passwordHash = passwordHash;
  user.role = role;
  user.status = "active";
  user.organizationId = organizationId;
  await user.save();
  return user;
}

async function upsertOrganization(createdBy) {
  let org = await Organization.findOne({ email: DATA.organization.email });
  if (!org) {
    org = await Organization.create({
      ...DATA.organization,
      createdBy: createdBy._id,
      status: "active",
    });
    return org;
  }

  org.name = DATA.organization.name;
  org.phone = DATA.organization.phone;
  org.organizationType = DATA.organization.organizationType;
  org.geo = DATA.organization.geo;
  org.status = "active";
  if (!org.createdBy) org.createdBy = createdBy._id;
  await org.save();
  return org;
}

async function upsertVehicle(org, createdBy, payload) {
  let vehicle = await Vehicle.findOne({
    organizationId: org._id,
    vehicleNumber: payload.vehicleNumber,
  });

  if (!vehicle) {
    vehicle = await Vehicle.create({
      ...payload,
      organizationId: org._id,
      createdBy: createdBy._id,
    });
    return vehicle;
  }

  vehicle.vehicleType = payload.vehicleType;
  vehicle.model = payload.model;
  vehicle.make = payload.make;
  vehicle.color = payload.color;
  vehicle.year = payload.year;
  vehicle.status = payload.status;
  vehicle.runningStatus = payload.runningStatus;
  await vehicle.save();
  return vehicle;
}

async function upsertDriver(org, payload) {
  let driver = await Driver.findOne({ organizationId: org._id, phone: payload.phone });
  if (!driver) {
    driver = await Driver.create({
      ...payload,
      organizationId: org._id,
    });
    return driver;
  }

  Object.assign(driver, payload);
  driver.organizationId = org._id;
  await driver.save();
  return driver;
}

async function upsertGpsDevice(org, createdBy, payload) {
  let device = await GpsDevice.findOne({ imei: payload.imei });
  if (!device) {
    device = await GpsDevice.create({
      ...payload,
      organizationId: org._id,
      createdBy: createdBy._id,
      isOnline: false,
    });
    return device;
  }

  device.organizationId = org._id;
  device.softwareVersion = payload.softwareVersion;
  device.status = payload.status;
  device.connectionStatus = payload.connectionStatus;
  device.isOnline = false;
  await device.save();
  return device;
}

async function ensureDeviceMapping(org, vehicle, device, assignedAt = new Date()) {
  await DeviceMapping.updateMany(
    {
      unassignedAt: null,
      $and: [
        {
          $or: [{ vehicleId: vehicle._id }, { gpsDeviceId: device._id }],
        },
        {
          $or: [
            { vehicleId: { $ne: vehicle._id } },
            { gpsDeviceId: { $ne: device._id } },
          ],
        },
      ],
    },
    { $set: { unassignedAt: new Date() } },
  );

  let mapping = await DeviceMapping.findOne({
    vehicleId: vehicle._id,
    gpsDeviceId: device._id,
    unassignedAt: null,
  });

  if (!mapping) {
    mapping = await DeviceMapping.create({
      organizationId: org._id,
      vehicleId: vehicle._id,
      gpsDeviceId: device._id,
      assignedAt,
      unassignedAt: null,
    });
  }

  if (!vehicle.deviceId || String(vehicle.deviceId) !== String(device._id)) {
    vehicle.deviceId = device._id;
  }
  if (vehicle.deviceImei !== device.imei) {
    vehicle.deviceImei = device.imei;
  }
  await vehicle.save();

  if (!device.vehicleId || String(device.vehicleId) !== String(vehicle._id)) {
    device.vehicleId = vehicle._id;
    await device.save();
  }

  return mapping;
}

async function ensureDriverMapping(org, vehicle, driver, assignedAt = new Date()) {
  await VehicleDriverMapping.updateMany(
    {
      unassignedAt: null,
      $and: [
        {
          $or: [{ vehicleId: vehicle._id }, { driverId: driver._id }],
        },
        {
          $or: [{ vehicleId: { $ne: vehicle._id } }, { driverId: { $ne: driver._id } }],
        },
      ],
    },
    { $set: { unassignedAt: new Date(), status: "unassigned" } },
  );

  let mapping = await VehicleDriverMapping.findOne({
    vehicleId: vehicle._id,
    driverId: driver._id,
    unassignedAt: null,
  });
  if (!mapping) {
    mapping = await VehicleDriverMapping.create({
      organizationId: org._id,
      vehicleId: vehicle._id,
      driverId: driver._id,
      assignedAt,
      unassignedAt: null,
      status: "assigned",
    });
  }

  if (!vehicle.driverId || String(vehicle.driverId) !== String(driver._id)) {
    vehicle.driverId = driver._id;
    await vehicle.save();
  }

  if (!driver.assignedVehicleId || String(driver.assignedVehicleId) !== String(vehicle._id)) {
    driver.assignedVehicleId = vehicle._id;
    await driver.save();
  }

  return mapping;
}

async function seedAll() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI not found. Please set it in server/.env");
  }

  console.log("Connecting MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Mongo connected.");
  loadModels();

  const superadmin = await upsertUser(DATA.superadmin, "superadmin", null);
  const organization = await upsertOrganization(superadmin);
  const admin = await upsertUser(DATA.admin, "admin", organization._id);

  if (!organization.adminUser || String(organization.adminUser) !== String(admin._id)) {
    organization.adminUser = admin._id;
    await organization.save();
  }

  const vehicleMain = await upsertVehicle(organization, admin, DATA.vehicleMain);
  const vehicleRahul = await upsertVehicle(organization, admin, DATA.vehicleRahul);

  const driverMain = await upsertDriver(organization, DATA.driverMain);
  const driverRahul = await upsertDriver(organization, DATA.driverRahul);

  const gpsMain = await upsertGpsDevice(organization, admin, DATA.gpsMain);

  const fixedAssignedAt = new Date("2026-03-09T10:00:00+05:30");
  await ensureDeviceMapping(organization, vehicleMain, gpsMain, fixedAssignedAt);
  await ensureDriverMapping(organization, vehicleMain, driverMain, fixedAssignedAt);
  await ensureDriverMapping(organization, vehicleRahul, driverRahul, fixedAssignedAt);

  console.log("\nSeed summary");
  console.log(`Org                : ${organization.name}`);
  console.log(`Driver #1          : ${driverRahul.firstName} ${driverRahul.lastName} | ${driverRahul.email} | ${driverRahul.phone} | ${driverRahul.licenseNumber} | ${vehicleRahul.vehicleNumber}`);
  console.log(`Vehicle            : ${vehicleMain.vehicleNumber} | ${vehicleMain.vehicleType} | ${vehicleMain.model} | ${organization.name} | ${driverMain.firstName} ${driverMain.lastName} | ${vehicleMain.status}`);
  console.log(`GPS Device         : ${gpsMain.imei} | ${gpsMain.softwareVersion} | ${organization.name} | ${vehicleMain.vehicleNumber} | ${gpsMain.connectionStatus} | ${gpsMain.status}`);
  console.log(`Driver Mapping     : ${vehicleMain.vehicleNumber} | ${gpsMain.imei} | ${driverMain.firstName} ${driverMain.lastName} | ${organization.name} | ${fixedAssignedAt.toLocaleDateString("en-GB")}`);

  await mongoose.connection.close();
  console.log("Mongo closed.");
}

async function clearVehicleHistory(imei) {
  const hist = await GpsHistory.deleteMany({ imei });
  const live = await GpsLiveData.deleteMany({ imei });
  console.log(`Cleared history for IMEI ${imei}: gpsHistory=${hist.deletedCount}, gpsLiveData=${live.deletedCount}`);
}

function runLiveSimulation(args) {
  const duration = num(args.duration, 1800); // 30 min
  const interval = num(args.interval, 5);
  const host = String(args.host || "127.0.0.1");
  const port = String(num(args.port, 6000));

  const simulator = path.resolve(__dirname, "realisticFullSimulation.js");
  const nodeArgs = [
    simulator,
    "--imei=123456789012345",
    "--vehicle=TS09ER1234",
    "--lat=30.7333",
    "--lng=76.7794",
    `--duration=${duration}`,
    `--interval=${interval}`,
    `--host=${host}`,
    `--port=${port}`,
  ];

  if (args.seed !== undefined) nodeArgs.push(`--seed=${args.seed}`);

  console.log("\nStarting 30-min Chandigarh live simulation...");
  console.log(`Command: node ${nodeArgs.join(" ")}`);
  console.log("Note: Keep backend TCP server running on configured port.\n");

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, nodeArgs, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Simulation exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    const skipSeed = Boolean(args["skip-seed"]);
    const seedOnly = Boolean(args["seed-only"]);
    const clearHistory = Boolean(args["clear-history"]);

    if (!skipSeed) {
      await seedAll();
    } else {
      console.log("Skipping seed step (--skip-seed).");
    }

    if (clearHistory) {
      await mongoose.connect(process.env.MONGO_URI);
      loadModels();
      await clearVehicleHistory(DATA.gpsMain.imei);
      await mongoose.connection.close();
    }

    if (!seedOnly) {
      await runLiveSimulation(args);
    } else {
      console.log("Seed completed. Simulation not started (--seed-only).");
    }

    console.log("\nAll done.");
  } catch (error) {
    console.error("\nSetup failed:", error.message || error);
    process.exit(1);
  }
}

main();
