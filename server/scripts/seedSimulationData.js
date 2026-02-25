const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../Modules/users/model");
const Organization = require("../Modules/organizations/model");
const Vehicle = require("../Modules/vehicle/model");
const GpsDevice = require("../Modules/gpsDevice/model");
const VehicleMapping = require("../Modules/deviceMapping/model");

const SEED = {
  superadmin: {
    email: "superadmin@gmail.com",
    mobile: "1234567890",
    password: "admin@123",
    firstName: "Super",
    lastName: "Admin",
  },
  admin: {
    email: "sim.admin@ajiva.test",
    mobile: "9876500001",
    password: "Admin@123",
    firstName: "Sim",
    lastName: "Admin",
  },
  organization: {
    name: "Simulation Org",
    email: "sim.org@ajiva.test",
    phone: "9876501001",
    organizationType: "fleet",
  },
  vehicle: {
    vehicleNumber: "TS09ER1234",
    vehicleType: "car",
    model: "SimCar",
    make: "Ajiva",
    year: 2024,
    color: "Blue",
  },
  device: {
    imei: "123456789012345",
    softwareVersion: "2.5AIS",
    status: "active",
  },
};

async function upsertSuperadmin() {
  let user = await User.findOne({ email: SEED.superadmin.email });
  if (user) return user;

  const passwordHash = await bcrypt.hash(SEED.superadmin.password, 10);
  user = await User.create({
    firstName: SEED.superadmin.firstName,
    lastName: SEED.superadmin.lastName,
    email: SEED.superadmin.email,
    mobile: SEED.superadmin.mobile,
    passwordHash,
    role: "superadmin",
    status: "active",
    organizationId: null,
  });
  return user;
}

async function upsertOrganization(createdBy) {
  let org = await Organization.findOne({ email: SEED.organization.email });
  if (org) return org;

  org = await Organization.create({
    ...SEED.organization,
    createdBy: createdBy._id,
  });
  return org;
}

async function upsertAdmin(org) {
  let admin = await User.findOne({ email: SEED.admin.email });
  if (!admin) {
    const passwordHash = await bcrypt.hash(SEED.admin.password, 10);
    admin = await User.create({
      firstName: SEED.admin.firstName,
      lastName: SEED.admin.lastName,
      email: SEED.admin.email,
      mobile: SEED.admin.mobile,
      passwordHash,
      role: "admin",
      status: "active",
      organizationId: org._id,
    });
  } else if (!admin.organizationId || String(admin.organizationId) !== String(org._id)) {
    admin.organizationId = org._id;
    admin.role = "admin";
    admin.status = "active";
    await admin.save();
  }
  return admin;
}

async function upsertVehicle(org, createdBy) {
  let vehicle = await Vehicle.findOne({
    organizationId: org._id,
    vehicleNumber: SEED.vehicle.vehicleNumber,
  });

  if (!vehicle) {
    vehicle = await Vehicle.create({
      ...SEED.vehicle,
      organizationId: org._id,
      createdBy: createdBy._id,
      status: "active",
      runningStatus: "inactive",
    });
  }
  return vehicle;
}

async function upsertDevice(org, createdBy) {
  let device = await GpsDevice.findOne({ imei: SEED.device.imei });
  if (!device) {
    device = await GpsDevice.create({
      ...SEED.device,
      organizationId: org._id,
      createdBy: createdBy._id,
    });
  } else {
    device.organizationId = org._id;
    device.status = "active";
    device.softwareVersion = SEED.device.softwareVersion;
    await device.save();
  }
  return device;
}

async function ensureSingleActiveMapping(org, vehicle, device) {
  await VehicleMapping.updateMany(
    {
      unassignedAt: null,
      $and: [
        {
          $or: [
            { vehicleId: vehicle._id },
            { gpsDeviceId: device._id },
          ],
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

  let mapping = await VehicleMapping.findOne({
    vehicleId: vehicle._id,
    gpsDeviceId: device._id,
    unassignedAt: null,
  });

  if (!mapping) {
    mapping = await VehicleMapping.create({
      organizationId: org._id,
      vehicleId: vehicle._id,
      gpsDeviceId: device._id,
      assignedAt: new Date(),
      unassignedAt: null,
    });
  }
  return mapping;
}

async function syncDenormalizedFields(vehicle, device) {
  let changedVehicle = false;
  if (!vehicle.deviceId || String(vehicle.deviceId) !== String(device._id)) {
    vehicle.deviceId = device._id;
    changedVehicle = true;
  }
  if (vehicle.deviceImei !== device.imei) {
    vehicle.deviceImei = device.imei;
    changedVehicle = true;
  }
  if (changedVehicle) await vehicle.save();

  if (!device.vehicleId || String(device.vehicleId) !== String(vehicle._id)) {
    device.vehicleId = vehicle._id;
    await device.save();
  }
}

async function setOrgAdmin(org, admin) {
  let changed = false;
  if (!org.adminUser || String(org.adminUser) !== String(admin._id)) {
    org.adminUser = admin._id;
    changed = true;
  }
  if (changed) await org.save();
}

async function run() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected.");

    const superadmin = await upsertSuperadmin();
    const organization = await upsertOrganization(superadmin);
    const admin = await upsertAdmin(organization);
    await setOrgAdmin(organization, admin);

    const vehicle = await upsertVehicle(organization, admin);
    const device = await upsertDevice(organization, admin);
    const mapping = await ensureSingleActiveMapping(organization, vehicle, device);
    await syncDenormalizedFields(vehicle, device);

    console.log("\nSimulation seed ready:");
    console.log(`Organization: ${organization.name} (${organization._id})`);
    console.log(`Admin: ${admin.email}`);
    console.log(`Vehicle: ${vehicle.vehicleNumber} (${vehicle._id})`);
    console.log(`Device IMEI: ${device.imei} (${device._id})`);
    console.log(`Mapping: ${mapping._id}`);
    console.log("\nNow run:");
    console.log("1) node scripts/testLocationHandler.js");
    console.log("2) node scripts/verifyDailyStatus.js");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
}

run();
