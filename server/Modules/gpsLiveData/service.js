const GpsLiveData = require("./model");
const GpsHistory = require("../gpsHistory/model");
const GpsDevice = require("../gpsDevice/model");
const VehicleDeviceMapping = require("../vehicleMapping/model");
const redisClient = require("../../config/redis");
const { getIo } = require("../../socket");
const VehicleDailyStats = require("../vehicleDailyStats/model");
const Alert = require("../alerts/model");
const Organization = require("../organizations/model");

const Service = {
    /**
     * Process GPS data from any source (HTTP, TCP, MQTT)
     * @param {Object} data - { imei, lat, lng, speed, ignition, organizationId, vehicleId }
     */
    processGpsData: async (data, overrides = {}) => {
        try {
            const { imei, lat, lng, speed, ignition } = data;
            // overrides can allow forcing orgId/vehId if passed from a trusted source (like authenticated API)
            let { organizationId, vehicleId } = data;

            if (overrides.organizationId) organizationId = overrides.organizationId;
            if (overrides.vehicleId) vehicleId = overrides.vehicleId;

            if (!imei || !lat || !lng) {
                return { success: false, message: "Missing required fields", status: 400 };
            }

            // 1. Get IDs if not provided
            let gpsDeviceId;

            // Try checking Redis cache for device metadata first
            const deviceCacheKey = `device_meta:${imei}`;
            const cachedDevice = await redisClient.get(deviceCacheKey);

            if (cachedDevice) {
                const parsed = JSON.parse(cachedDevice);
                // data.organizationId might be null from device, so prefer cached
                organizationId = parsed.organizationId;
                vehicleId = parsed.vehicleId; // might be null
                gpsDeviceId = parsed._id;
            } else {
                const device = await GpsDevice.findOne({ imei });
                if (!device) {
                    return { success: false, message: "Device not found", status: 404 };
                }
                organizationId = device.organizationId;
                gpsDeviceId = device._id;

                // Find active vehicle mapping
                const mapping = await VehicleDeviceMapping.findOne({
                    gpsDeviceId: gpsDeviceId,
                    unassignedAt: null
                });

                if (mapping) {
                    vehicleId = mapping.vehicleId;
                }

                // Cache for 1 hour
                const cacheObj = {
                    _id: device._id,
                    organizationId: device.organizationId,
                    vehicleId: vehicleId
                };
                await redisClient.setex(deviceCacheKey, 3600, JSON.stringify(cacheObj));
            }

            // Check if device is assigned to vehicle (Required for History/LiveData)
            if (!organizationId || !vehicleId) {
                return { success: false, message: "Device not assigned to vehicle", status: 400 };
            }

            const timestamp = new Date();

            // 2. Broadcast Real-time Data (emit raw payload with imei & computed fields)
            let io;
            try {
                io = getIo();
            } catch (e) {
                io = null;
            }

            const socketPayload = {
                imei,
                organizationId,
                vehicleId,
                gpsDeviceId,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                speed: parseFloat(speed) || 0,
                ignition: !!ignition,
                updatedAt: timestamp
            };
            if (io) {
                io.to(`device_${imei}`).emit("gps_update", socketPayload);
                if (organizationId) io.to(`org_${organizationId}`).emit("gps_update", socketPayload);
            }

            // 3. Update Last Known Location in GpsLiveData using existing schema fields
            const prev = await GpsLiveData.findOne({ gpsDeviceId: gpsDeviceId });

            const liveUpdate = {
                organizationId,
                vehicleId,
                gpsDeviceId,
                latitude: parseFloat(lat),
                longitude: parseFloat(lng),
                currentSpeed: parseFloat(speed) || 0,
                ignitionStatus: !!ignition,
                movementStatus: parseFloat(speed) && parseFloat(speed) > 0 ? "moving" : "stopped",
            };

            // set ignition timestamps when ignition changed
            const prevIgnition = prev ? !!prev.ignitionStatus : false;
            if (!!ignition && !prevIgnition) {
                liveUpdate.lastIgnitionOn = timestamp;
            }
            if (!ignition && prevIgnition) {
                liveUpdate.lastIgnitionOff = timestamp;
            }

            await GpsLiveData.findOneAndUpdate(
                { gpsDeviceId: gpsDeviceId },
                { $set: liveUpdate },
                { upsert: true, new: true }
            );

            // 4. Redis Throttling for History (create records matching GpsHistory schema)
            const lastHistoryKey = `gps_last_history:${imei}`;
            const lastHistoryTime = await redisClient.get(lastHistoryKey);
            const now = Date.now();

            if (!lastHistoryTime || now - parseInt(lastHistoryTime) >= 4000) {
                await GpsHistory.create({
                    organizationId: organizationId,
                    vehicleId: vehicleId,
                    gpsDeviceId: gpsDeviceId,
                    latitude: parseFloat(lat),
                    longitude: parseFloat(lng),
                    speed: parseFloat(speed) || 0,
                    heading: null,
                    altitude: null,
                    accuracy: null,
                    timestamp: timestamp
                });
                await redisClient.set(lastHistoryKey, now);
            }

            // 5. Update VehicleDailyStats: distance, times, speeds, ignition timestamps
            try {
                const haversineKm = (aLat, aLng, bLat, bLng) => {
                    if (!aLat || !aLng || !bLat || !bLng) return 0;
                    const R = 6371;
                    const toRad = (d) => d * Math.PI / 180;
                    const dLat = toRad(bLat - aLat);
                    const dLon = toRad(bLng - aLng);
                    const lat1 = toRad(aLat), lat2 = toRad(bLat);
                    const sinDLat = Math.sin(dLat/2), sinDLon = Math.sin(dLon/2);
                    const c = 2 * Math.asin(Math.sqrt(sinDLat*sinDLat + Math.cos(lat1)*Math.cos(lat2)*sinDLon*sinDLon));
                    return R * c;
                };

                const dayStart = new Date();
                dayStart.setHours(0, 0, 0, 0);

                // compute delta time (seconds) and distance (km) from previous live data
                const prevUpdatedAt = prev && prev.updatedAt ? new Date(prev.updatedAt) : null;
                const timeDiffSec = prevUpdatedAt ? Math.max(1, Math.round((timestamp - prevUpdatedAt) / 1000)) : 0;
                const prevLat = prev && typeof prev.latitude !== 'undefined' ? parseFloat(prev.latitude) : null;
                const prevLng = prev && typeof prev.longitude !== 'undefined' ? parseFloat(prev.longitude) : null;
                const curLat = parseFloat(lat);
                const curLng = parseFloat(lng);
                const distanceKm = (prevLat !== null && prevLng !== null) ? haversineKm(prevLat, prevLng, curLat, curLng) : 0;

                const movement = liveUpdate.movementStatus || (parseFloat(speed) > 0 ? 'moving' : 'stopped');

                let stats = await VehicleDailyStats.findOne({ vehicleId: vehicleId, date: dayStart });
                if (!stats) {
                    // create initial stats doc for the day with initial values
                    const runningTime = movement === 'moving' ? timeDiffSec : 0;
                    const idleTime = movement === 'idle' ? timeDiffSec : 0;
                    const stoppedTime = movement === 'stopped' ? timeDiffSec : 0;
                    const maxSpeed = parseFloat(speed) || 0;
                    const totalDistance = distanceKm;
                    const avgSpeed = runningTime > 0 ? (totalDistance / (runningTime / 3600)) : 0;

                    stats = await VehicleDailyStats.create({
                        organizationId,
                        vehicleId,
                        gpsDeviceId,
                        date: dayStart,
                        totalDistance: totalDistance,
                        maxSpeed: maxSpeed,
                        avgSpeed: avgSpeed,
                        runningTime,
                        idleTime,
                        stoppedTime,
                        firstIgnitionOn: !!ignition ? timestamp : null,
                        lastIgnitionOff: !ignition ? timestamp : null
                    });
                    // emit new daily stats to sockets
                    try {
                        if (io) {
                            const statsDoc = stats.toObject ? stats.toObject() : stats;
                            try { io.to(`org_${organizationId}`).emit('vehicle_daily_stats', statsDoc); } catch (e) {}
                            try { io.to(`vehicle_${vehicleId}`).emit('vehicle_daily_stats', statsDoc); } catch (e) {}
                        }
                    } catch (e) { }
                } else {
                    // incrementally update fields
                    const inc = {};
                    if (distanceKm > 0) inc.totalDistance = distanceKm;
                    if (movement === 'moving') inc.runningTime = timeDiffSec;
                    else if (movement === 'idle') inc.idleTime = timeDiffSec;
                    else inc.stoppedTime = timeDiffSec;

                    const updateOps = { $inc: inc };
                    // update maxSpeed
                    const curSpeed = parseFloat(speed) || 0;
                    updateOps.$max = { maxSpeed: curSpeed };

                    await VehicleDailyStats.updateOne({ _id: stats._id }, updateOps);

                    // recompute avgSpeed based on totalDistance / runningTimeHours
                    const updated = await VehicleDailyStats.findById(stats._id).lean();
                    const runningHours = (updated.runningTime || 0) / 3600;
                    const avgSpeed = runningHours > 0 ? (updated.totalDistance / runningHours) : 0;
                    const ignUpdates = {};
                    if (!!ignition && !updated.firstIgnitionOn) ignUpdates.firstIgnitionOn = timestamp;
                    if (!ignition) ignUpdates.lastIgnitionOff = timestamp;

                    const finalSet = { avgSpeed };
                    if (Object.keys(ignUpdates).length > 0) Object.assign(finalSet, ignUpdates);
                    await VehicleDailyStats.updateOne({ _id: stats._id }, { $set: finalSet });
                    // emit updated daily stats to sockets
                    try {
                        if (io) {
                            const finalUpdated = await VehicleDailyStats.findById(stats._id).lean();
                            try { io.to(`org_${organizationId}`).emit('vehicle_daily_stats', finalUpdated); } catch (e) {}
                            try { io.to(`vehicle_${vehicleId}`).emit('vehicle_daily_stats', finalUpdated); } catch (e) {}
                        }
                    } catch (e) { }
                }
            } catch (e) {
                console.error("VehicleDailyStats update error:", e && e.stack ? e.stack : e);
            }

            // 6. Alerts integration (throttled using Redis) - use org-configured thresholds when available
            try {
                const ALERT_COOLDOWN = {
                    speed: 60, // seconds
                    battery: 300,
                    ignition: 60
                };
                const curSpeed = parseFloat(speed) || 0;
                const battery = typeof data.batteryLevel !== 'undefined' ? parseFloat(data.batteryLevel) : null;

                // fetch org-specific thresholds (cache in redis briefly)
                let orgSettings = null;
                try {
                    const orgCacheKey = `org_settings:${organizationId}`;
                    const cached = await redisClient.get(orgCacheKey);
                    if (cached) {
                        orgSettings = JSON.parse(cached);
                    } else {
                        const org = await Organization.findById(organizationId).select('settings').lean();
                        if (org && org.settings) orgSettings = org.settings;
                        await redisClient.setex(orgCacheKey, 30, JSON.stringify(orgSettings || {}));
                    }
                } catch (e) {
                    orgSettings = null;
                }

                const SPEED_LIMIT = orgSettings && typeof orgSettings.speedLimit === 'number' ? orgSettings.speedLimit : 80;
                const LOW_BATTERY = orgSettings && typeof orgSettings.lowFuelThreshold === 'number' ? orgSettings.lowFuelThreshold : 20;
                const SPEED_ALERT_ENABLED = orgSettings && typeof orgSettings.speedAlert !== 'undefined' ? !!orgSettings.speedAlert : true;

                // Overspeed alert
                if (SPEED_ALERT_ENABLED && curSpeed > SPEED_LIMIT) {
                    const key = `alert_speed:${imei}`;
                    const last = await redisClient.get(key);
                    if (!last) {
                        const alertDoc = await Alert.create({
                            organizationId,
                            gpsDeviceId: gpsDeviceId,
                            vehicleId: vehicleId,
                            type: 'overspeed',
                            message: `Speed ${curSpeed} km/h exceeded limit ${SPEED_LIMIT} km/h`,
                            locationType: 'Point',
                            locationCoordinates: [parseFloat(lng), parseFloat(lat)],
                            acknowledged: false
                        });
                        await redisClient.setex(key, ALERT_COOLDOWN.speed, Date.now());
                        if (io) {
                            try { io.to(`org_${organizationId}`).emit('alert', alertDoc); } catch (e) { }
                            try { io.to(`device_${imei}`).emit('alert', alertDoc); } catch (e) { }
                        }
                    }
                }

                // Low battery alert
                if (battery !== null && battery <= LOW_BATTERY) {
                    const key = `alert_battery:${imei}`;
                    const last = await redisClient.get(key);
                    if (!last) {
                        const alertDoc = await Alert.create({
                            organizationId,
                            gpsDeviceId: gpsDeviceId,
                            vehicleId: vehicleId,
                            type: 'low_battery',
                            message: `Battery low: ${battery}%`,
                            locationType: 'Point',
                            locationCoordinates: [parseFloat(lng), parseFloat(lat)],
                            acknowledged: false
                        });
                        await redisClient.setex(key, ALERT_COOLDOWN.battery, Date.now());
                        if (io) {
                            try { io.to(`org_${organizationId}`).emit('alert', alertDoc); } catch (e) { }
                            try { io.to(`device_${imei}`).emit('alert', alertDoc); } catch (e) { }
                        }
                    }
                }

                // Ignition off event
                if (!ignition && prev && prev.ignitionStatus) {
                    const key = `alert_ignition:${imei}`;
                    const last = await redisClient.get(key);
                    if (!last) {
                        const alertDoc = await Alert.create({
                            organizationId,
                            gpsDeviceId: gpsDeviceId,
                            vehicleId: vehicleId,
                            type: 'ignition_off',
                            message: `Ignition turned off`,
                            locationType: 'Point',
                            locationCoordinates: [parseFloat(lng), parseFloat(lat)],
                            acknowledged: false
                        });
                        await redisClient.setex(key, ALERT_COOLDOWN.ignition, Date.now());
                        if (io) {
                            try { io.to(`org_${organizationId}`).emit('alert', alertDoc); } catch (e) { }
                            try { io.to(`device_${imei}`).emit('alert', alertDoc); } catch (e) { }
                        }
                    }
                }
            } catch (e) {
                console.error('Alert integration error:', e && e.stack ? e.stack : e);
            }

            return { success: true, message: "Data received", status: 200 };

        } catch (error) {
            console.error("Service Error:", error);
            return { success: false, message: `Server error: ${error.message}`, status: 500, error };
        }
    }
};

module.exports = Service;
