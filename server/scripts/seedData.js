const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

// Models
const User = require("../Modules/users/model");
const Organization = require("../Modules/organizations/model");
const Vehicle = require("../Modules/vehicle/model");
const GpsDevice = require("../Modules/gpsDevice/model");
const DeviceMapping = require("../Modules/deviceMapping/model");
const Driver = require("../Modules/drivers/model");
const Geofence = require("../Modules/geofence/model");
const POI = require("../Modules/poi/model");
const Alert = require("../Modules/alerts/model");
const GpsLiveData = require("../Modules/gpsLiveData/model");
const GpsHistory = require("../Modules/gpsHistory/model");
const VehicleDailyStats = require("../Modules/vehicleDailyStats/model");
const HealthMonitoring = require("../Modules/healthMonitoring/model");
const EmergencyEvent = require("../Modules/emergencyEvents/model");
const VehicleDriverMapping = require("../Modules/vehicleDriverMapping/model");

const connectDB = require("../config/database");

// --- Helper Data ---

const INDIAN_CITIES = [
    { name: "Hyderabad", state: "Telangana", lat: 17.3850, lng: 78.4867 },
    { name: "Mumbai", state: "Maharashtra", lat: 19.0760, lng: 72.8777 },
    { name: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.2090 },
    { name: "Bangalore", state: "Karnataka", lat: 12.9716, lng: 77.5946 },
    { name: "Chennai", state: "Tamil Nadu", lat: 13.0827, lng: 80.2707 }
];

const NAMES = [
    { first: "Amit", last: "Sharma" }, { first: "Rahul", last: "Varma" },
    { first: "Priya", last: "Patel" }, { first: "Sneha", last: "Reddy" },
    { first: "Vikram", last: "Singh" }, { first: "Anjali", last: "Gupta" },
    { first: "Rajesh", last: "Kumar" }, { first: "Deepak", last: "Jangid" },
    { first: "Suresh", last: "Raina" }, { first: "Pooja", last: "Hegde" },
    { first: "Vijay", last: "Devarakonda" }, { first: "Rashmika", last: "Mandanna" },
    { first: "Karthik", last: "Aryan" }, { first: "Sara", last: "Ali Khan" },
    { first: "Varun", last: "Dhawan" }
];

const VEHICLE_MODELS = [
    { make: "Tata", model: "Nexon", type: "car" },
    { make: "Maruti", model: "Swift", type: "car" },
    { make: "Mahindra", model: "XUV700", type: "car" },
    { make: "Ashok Leyland", model: "Dost", type: "truck" },
    { make: "BharatBenz", model: "1617R", type: "truck" },
    { make: "Eicher", model: "Skyline", type: "bus" },
    { make: "Honda", model: "Activa", type: "bike" }
];

const generateVehicleNumber = (stateCode) => {
    const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const L1 = letters[Math.floor(Math.random() * letters.length)];
    const L2 = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    const dist = String(Math.floor(1 + Math.random() * 50)).padStart(2, '0');
    return `${stateCode} ${dist} ${L1}${L2} ${num}`;
};

const generateImei = () => {
    return "86" + Math.random().toString().slice(2, 15).padEnd(13, '0');
};

const seed = async () => {
    try {
        await connectDB();
        console.log("🚀 Starting seeding process...");

        // 1. Clear Collections
        console.log("🧹 Clearing existing data...");
        await Promise.all([
            User.deleteMany({}),
            Organization.deleteMany({}),
            Vehicle.deleteMany({}),
            GpsDevice.deleteMany({}),
            DeviceMapping.deleteMany({}),
            Driver.deleteMany({}),
            Geofence.deleteMany({}),
            POI.deleteMany({}),
            Alert.deleteMany({}),
            GpsLiveData.deleteMany({}),
            GpsHistory.deleteMany({}),
            VehicleDailyStats.deleteMany({}),
            HealthMonitoring.deleteMany({}),
            EmergencyEvent.deleteMany({}),
            VehicleDriverMapping.deleteMany({})
        ]);

        const passwordHash = await bcrypt.hash("admin@123", 10);
        const adminPasswordHash = await bcrypt.hash("Admin@123", 10);

        // 2. Create SuperAdmin
        console.log("👤 Creating SuperAdmin...");
        const superAdmin = await User.create({
            firstName: "Super",
            lastName: "Admin",
            email: "superadmin@gmail.com",
            mobile: "9111111111",
            passwordHash: passwordHash,
            role: "superadmin",
            status: "active"
        });

        const organizations = [];
        const admins = [];
        const allVehicles = [];
        const allDevices = [];
        const allDrivers = [];

        // 3. Create 3 Organizations and 3 Admins
        console.log("🏢 Creating 3 Organizations and Admins...");
        for (let i = 1; i <= 3; i++) {
            const city = INDIAN_CITIES[i - 1];
            const org = await Organization.create({
                name: `Ajiva Logistics - ${city.name}`,
                organizationType: "logistics",
                email: `admin${i}@gmail.com`,
                phone: `910000000${i}`,
                address: {
                    addressLine: `Business Hub, ${city.name}`,
                    city: city.name,
                    state: city.state,
                    country: "India",
                    pincode: "500001"
                },
                geo: {
                    lat: city.lat,
                    lng: city.lng,
                    timezone: "Asia/Kolkata"
                },
                settings: {
                    speedAlert: true,
                    speedLimit: 80,
                    idleTimeThreshold: 10
                },
                createdBy: superAdmin._id
            });
            organizations.push(org);

            const admin = await User.create({
                organizationId: org._id,
                firstName: `Admin`,
                lastName: `${i}`,
                email: `admin${i}@gmail.com`,
                mobile: `912222222${i}`,
                passwordHash: adminPasswordHash,
                role: "admin",
                status: "active"
            });
            admins.push(admin);

            // Update org with adminUser
            org.adminUser = admin._id;
            await org.save();

            // 4. Create 5 Sub-Admins for each Org
            console.log(`👥 Creating 5 Sub-Admins for Org ${i}...`);
            for (let j = 1; j <= 5; j++) {
                const nameIdx = (i * 5) + j;
                const name = NAMES[nameIdx % NAMES.length];
                await User.create({
                    organizationId: org._id,
                    firstName: name.first,
                    lastName: name.last,
                    email: `${name.first.toLowerCase()}${i}${j}@gmail.com`,
                    mobile: `91333333${i}${j}`,
                    passwordHash: adminPasswordHash,
                    role: "admin", // Standard admin roles for sub-admins
                    status: "active"
                });
            }

            // 5. Create 10 Drivers for each Org
            console.log(`🚜 Creating 10 Drivers for Org ${i}...`);
            for (let k = 1; k <= 10; k++) {
                const nameIdx = (i * 10) + k;
                const name = NAMES[nameIdx % NAMES.length];
                const driver = await Driver.create({
                    organizationId: org._id,
                    firstName: name.first,
                    lastName: name.last,
                    phone: `91444444${i}${k}`,
                    email: `driver${i}${k}@ajiva.com`,
                    licenseNumber: `DL${i}${k}2023000${k}`,
                    licenseExpiry: new Date(2030, 0, 1),
                    address: `${city.name} Driver Colony`,
                    status: "active"
                });
                allDrivers.push(driver);
            }

            // 6. Create 5 GPS Devices for each Org
            console.log(`📡 Creating 5 GPS Devices for Org ${i}...`);
            for (let l = 1; l <= 5; l++) {
                const imei = generateImei();
                const device = await GpsDevice.create({
                    imei: imei,
                    organizationId: org._id,
                    softwareVersion: "AIS140-V1.2",
                    vendorId: "ROADRPA",
                    manufacturer: "Ajiva Tech",
                    deviceModel: "AT-500",
                    simNumber: `91555555${i}${l}`,
                    isOnline: true,
                    lastSeen: new Date(),
                    status: "active",
                    createdBy: admin._id,
                    configuration: {
                        speedLimit: 80,
                        updateRateIgnitionOn: 10,
                        updateRateIgnitionOff: 60
                    }
                });
                allDevices.push(device);

                // 7. Create 5 Vehicles for each Org
                console.log(`🚗 Creating Vehicle ${l} for Org ${i}...`);
                const model = VEHICLE_MODELS[(i * 5 + l) % VEHICLE_MODELS.length];
                const vehicleNo = generateVehicleNumber(org.address.state === "Telangana" ? "TS" : org.address.state === "Maharashtra" ? "MH" : "DL");
                const vehicle = await Vehicle.create({
                    organizationId: org._id,
                    vehicleType: model.type,
                    vehicleNumber: vehicleNo,
                    make: model.make,
                    model: model.model,
                    year: 2020 + Math.floor(Math.random() * 4), // 2020-2023
                    color: ["White", "Silver", "Grey", "Black", "Blue"][Math.floor(Math.random() * 5)],
                    status: "active",
                    runningStatus: "stopped",
                    ais140Compliant: Math.random() > 0.3, // 70% chance of being compliant
                    deviceId: device._id,
                    deviceImei: device.imei,
                    createdBy: admin._id,
                    currentLocation: {
                        latitude: city.lat + (Math.random() * 0.05) - 0.025,
                        longitude: city.lng + (Math.random() * 0.05) - 0.025,
                        address: `${city.name} Sector ${l}`
                    }
                });
                allVehicles.push(vehicle);

                // Update device with vehicleId
                device.vehicleId = vehicle._id;
                device.vehicleRegistrationNumber = vehicle.vehicleNumber;
                await device.save();

                // 8. Create Mappings
                console.log(`🔗 Mapping Device and Driver to Vehicle...`);
                await DeviceMapping.create({
                    organizationId: org._id,
                    vehicleId: vehicle._id,
                    gpsDeviceId: device._id
                });

                const driver = allDrivers.pop(); // Take one driver for each vehicle
                if (driver) {
                    vehicle.driverId = driver._id;
                    await vehicle.save();
                    driver.assignedVehicleId = vehicle._id;
                    await driver.save();

                    await VehicleDriverMapping.create({
                        organizationId: org._id,
                        vehicleId: vehicle._id,
                        driverId: driver._id,
                        status: "assigned"
                    });
                }

                // 9. Operational Data: Geofences & POIs
                console.log(`📍 Adding Geofences & POIs for Vehicle ${vehicle.vehicleNumber}...`);
                await Geofence.create({
                    organizationId: org._id,
                    name: `Office Bound - ${vehicle.vehicleNumber}`,
                    type: "circle",
                    circleCenterCoordinates: [vehicle.currentLocation.longitude, vehicle.currentLocation.latitude],
                    circleRadius: 500,
                    alertOnEnter: true,
                    alertOnExit: true
                });

                await POI.create({
                    organizationId: org._id,
                    name: `Depot ${i}-${l}`,
                    description: `Primary depot for ${vehicle.vehicleNumber}`,
                    type: "hub",
                    locationCoordinates: [vehicle.currentLocation.longitude + 0.001, vehicle.currentLocation.latitude + 0.001],
                    radius: 300
                });

                // 10. Operational Data: Live Data, History, Alerts
                console.log(`📊 Generating historical data for Vehicle ${vehicle.vehicleNumber}...`);
                const timestamp = new Date();
                
                // Live Data
                await GpsLiveData.create({
                    organizationId: org._id,
                    vehicleId: vehicle._id,
                    gpsDeviceId: device._id,
                    imei: device.imei,
                    gpsTimestamp: timestamp,
                    latitude: vehicle.currentLocation.latitude,
                    longitude: vehicle.currentLocation.longitude,
                    currentLocation: vehicle.currentLocation.address,
                    currentSpeed: 0,
                    ignitionStatus: false,
                    movementStatus: "stopped",
                    batteryLevel: 85 + Math.floor(Math.random() * 15),
                    gsmSignalStrength: 20 + Math.floor(Math.random() * 11),
                    numberOfSatellites: 8 + Math.floor(Math.random() * 12),
                    fuelPercentage: 40 + Math.floor(Math.random() * 50),
                    temperature: (25 + Math.floor(Math.random() * 10)) + "°C",
                    poi: `Depot ${i}-${l}`
                });

                // History (10 points)
                for (let h = 1; h <= 10; h++) {
                    await GpsHistory.create({
                        organizationId: org._id,
                        vehicleId: vehicle._id,
                        gpsDeviceId: device._id,
                        imei: device.imei,
                        gpsTimestamp: new Date(timestamp.getTime() - (h * 600000)), 
                        latitude: vehicle.currentLocation.latitude - (h * 0.0005),
                        longitude: vehicle.currentLocation.longitude - (h * 0.0005),
                        speed: 30 + Math.floor(Math.random() * 30),
                        ignitionStatus: true
                    });
                }

                // Daily Stats (Varied)
                const day = new Date();
                day.setHours(0, 0, 0, 0);
                await VehicleDailyStats.create({
                    organizationId: org._id,
                    vehicleId: vehicle._id,
                    gpsDeviceId: device._id,
                    imei: device.imei,
                    date: day,
                    totalDistance: 50 + Math.floor(Math.random() * 200),
                    maxSpeed: 60 + Math.floor(Math.random() * 40),
                    avgSpeed: 30 + Math.floor(Math.random() * 30),
                    runningTime: 1800 + Math.floor(Math.random() * 7200),
                    idleTime: 300 + Math.floor(Math.random() * 1800),
                    stoppedTime: 3600 + Math.floor(Math.random() * 14400),
                    totalTrips: 1 + Math.floor(Math.random() * 10),
                    alertCounts: {
                        overspeedCount: Math.floor(Math.random() * 5),
                        emergencyCount: 0
                    }
                });

                // Health Monitoring
                await HealthMonitoring.create({
                    organizationId: org._id,
                    gpsDeviceId: device._id,
                    vehicleId: vehicle._id,
                    imei: device.imei,
                    batteryPercentage: 95,
                    timestamp: timestamp,
                    softwareVersion: "AIS140-V1.2"
                });

                // Emergency Event (1 active for Org 1)
                if (i === 1 && l === 1) {
                    await EmergencyEvent.create({
                        organizationId: org._id,
                        vehicleId: vehicle._id,
                        gpsDeviceId: device._id,
                        imei: device.imei,
                        eventType: "emergency_on",
                        latitude: vehicle.currentLocation.latitude,
                        longitude: vehicle.currentLocation.longitude,
                        gpsTimestamp: timestamp,
                        speed: 0,
                        status: "active"
                    });
                }
            }
        }

        console.log("✅ Seeding completed successfully!");
        console.log("--------------------------------------------------");
        console.log("SuperAdmin: superadmin@gmail.com / admin@123");
        console.log("Admin 1: admin1@gmail.com / Admin@123");
        console.log("Admin 2: admin2@gmail.com / Admin@123");
        console.log("Admin 3: admin3@gmail.com / Admin@123");
        console.log("--------------------------------------------------");

        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
};

seed();
