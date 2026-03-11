const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../Modules/users/model");
const Organization = require("../Modules/organizations/model");
const Vehicle = require("../Modules/vehicle/model");
const GpsDevice = require("../Modules/gpsDevice/model");
const VehicleMapping = require("../Modules/deviceMapping/model");
const Driver = require("../Modules/drivers/model");

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
  vehicles: [
    {
      vehicleNumber: "TS09ER1234",
      vehicleType: "car",
      model: "SimCar",
      make: "Ajiva",
      year: 2024,
      color: "Blue"
    },
    {
      vehicleNumber: "TS09ER1235",
      vehicleType: "car",
      model: "SimCar",
      make: "Ajiva",
      year: 2024,
      color: "Red"
    },
    {
      vehicleNumber: "TS09ER1236",
      vehicleType: "car",
      model: "SimCar",
      make: "Ajiva",
      year: 2024,
      color: "Green"
    },
    {
      vehicleNumber: "TS09ER1237",
      vehicleType: "car",
      model: "SimCar",
      make: "Ajiva",
      year: 2024,
      color: "White"
    },
    {
      vehicleNumber: "TS09ER1238",
      vehicleType: "car",
      model: "SimCar",
      make: "Ajiva",
      year: 2024,
      color: "Black"
    }
  ],
  drivers: [
    {
      firstName: "Ramesh",
      lastName: "Kumar",
      phone: "9876500002",
      email: "ramesh.kumar@ajiva.test",
      licenseNumber: "DL1234567890123",
      licenseExpiry: new Date("2025-12-31"),
      address: "123 Main Street, Delhi",
      status: "active",
      availability: true
    },
    {
      firstName: "Suresh",
      lastName: "Sharma",
      phone: "9876500003",
      email: "suresh.sharma@ajiva.test",
      licenseNumber: "DL2345678901234",
      licenseExpiry: new Date("2025-12-31"),
      address: "456 Park Avenue, Delhi",
      status: "active",
      availability: true
    },
    {
      firstName: "Amit",
      lastName: "Singh",
      phone: "9876500004",
      email: "amit.singh@ajiva.test",
      licenseNumber: "DL3456789012345",
      licenseExpiry: new Date("2025-12-31"),
      address: "789 Market Road, Delhi",
      status: "active",
      availability: true
    },
    {
      firstName: "Vikram",
      lastName: "Mehta",
      phone: "9876500005",
      email: "vikram.mehta@ajiva.test",
      licenseNumber: "DL4567890123456",
      licenseExpiry: new Date("2025-12-31"),
      address: "321 Garden Street, Delhi",
      status: "active",
      availability: true
    },
    {
      firstName: "Rahul",
      lastName: "Patel",
      phone: "9876500006",
      email: "rahul.patel@ajiva.test",
      licenseNumber: "DL5678901234567",
      licenseExpiry: new Date("2025-12-31"),
      address: "654 Temple Road, Delhi",
      status: "active",
      availability: true
    }
  ],
  devices: [
    {
      imei: "123456789012345",
      softwareVersion: "2.5AIS",
      status: "active"
    },
    {
      imei: "987654321098765",
      softwareVersion: "2.5AIS",
      status: "active"
    },
    {
      imei: "111122223333444",
      softwareVersion: "2.5AIS",
      status: "active"
    },
    {
      imei: "555566667777888",
      softwareVersion: "2.5AIS",
      status: "active"
    },
    {
      imei: "999900001111222",
      softwareVersion: "2.5AIS",
      status: "active"
    }
  ],
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

async function upsertVehicles(org, createdBy) {
  const vehicles = [];
  
  for (const vehicleData of SEED.vehicles) {
    let vehicle = await Vehicle.findOne({
      organizationId: org._id,
      vehicleNumber: vehicleData.vehicleNumber,
    });

    if (!vehicle) {
      vehicle = await Vehicle.create({
        ...vehicleData,
        organizationId: org._id,
        createdBy: createdBy._id,
        status: "active",
        runningStatus: "inactive",
      });
    }
    vehicles.push(vehicle);
  }
  
  return vehicles;
}

async function upsertDrivers(org, createdBy) {
  const drivers = [];
  
  for (const driverData of SEED.drivers) {
    let driver = await Driver.findOne({
      organizationId: org._id,
      phone: driverData.phone
    });

    if (!driver) {
      driver = await Driver.create({
        ...driverData,
        organizationId: org._id,
        createdBy: createdBy._id,
      });
    }
    drivers.push(driver);
  }
  
  return drivers;
}

async function assignDriversToVehicles(vehicles, drivers) {
  // Assign each driver to a vehicle
  for (let i = 0; i < vehicles.length && i < drivers.length; i++) {
    const vehicle = vehicles[i];
    const driver = drivers[i];
    
    // Update driver with assigned vehicle
    driver.assignedVehicleId = vehicle._id;
    await driver.save();
    
    // Update vehicle with driver info
    vehicle.driverName = `${driver.firstName} ${driver.lastName}`;
    vehicle.driverMobile = driver.phone;
    await vehicle.save();
  }
}

async function upsertDevices(org, createdBy) {
  const devices = [];
  
  for (const deviceData of SEED.devices) {
    let device = await GpsDevice.findOne({ imei: deviceData.imei });
    if (!device) {
      device = await GpsDevice.create({
        ...deviceData,
        organizationId: org._id,
        createdBy: createdBy._id,
      });
    } else {
      device.organizationId = org._id;
      device.status = "active";
      await device.save();
    }
    devices.push(device);
  }
  
  return devices;
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

    const vehicles = await upsertVehicles(organization, admin);
    const drivers = await upsertDrivers(organization, admin);
    const devices = await upsertDevices(organization, admin);
    
    // Assign drivers to vehicles
    await assignDriversToVehicles(vehicles, drivers);
    
    // Create mappings for each vehicle-device pair
    const mappings = [];
    for (let i = 0; i < vehicles.length && i < devices.length; i++) {
      const mapping = await ensureSingleActiveMapping(organization, vehicles[i], devices[i]);
      await syncDenormalizedFields(vehicles[i], devices[i]);
      mappings.push(mapping);
    }

    console.log("\nSimulation seed ready:");
    console.log(`Organization: ${organization.name} (${organization._id})`);
    console.log(`Admin: ${admin.email}`);
    console.log(`Vehicles: ${vehicles.length} created`);
    console.log(`Drivers: ${drivers.length} created`);
    console.log(`Devices: ${devices.length} created`);
    console.log(`Mappings: ${mappings.length} created`);
    
    vehicles.forEach((vehicle, index) => {
      console.log(`  - ${vehicle.vehicleNumber} → ${drivers[index].firstName} ${drivers[index].lastName} (${devices[index].imei})`);
    });
    
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
