const GpsLiveData = require("./model");
const GpsHistory = require("../gpsHistory/model");
const GpsDevice = require("../gpsDevice/model");
const VehicleDeviceMapping = require("../vehicleMapping/model");
const redisClient = require("../../config/redis");
const { getIo } = require("../../socket");

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

            const dataPayload = {
                organizationId: organizationId,
                vehicleId: vehicleId,
                gpsDeviceId: gpsDeviceId,
                location: {
                    type: "Point",
                    coordinates: [parseFloat(lng), parseFloat(lat)],
                    speed: parseFloat(speed) || 0,
                    ignition: !!ignition,
                },
                updatedAt: timestamp,
                imei // useful to keep in payload for socket
            };

            // 2. Broadcast Real-time Data
            const io = getIo();
            if (io) {
                io.to(`device_${imei}`).emit("gps_update", dataPayload);
                if (organizationId) {
                    io.to(`org_${organizationId}`).emit("gps_update", dataPayload);
                }
            }

            // 3. Update Last Known Location
            await GpsLiveData.findOneAndUpdate(
                { gpsDeviceId: gpsDeviceId },
                dataPayload,
                { upsert: true, new: true }
            );

            // 4. Redis Throttling for History
            const lastHistoryKey = `gps_last_history:${imei}`;
            const lastHistoryTime = await redisClient.get(lastHistoryKey);
            const now = Date.now();

            // If no history record in last 4 seconds, save to history
            if (!lastHistoryTime || now - parseInt(lastHistoryTime) >= 4000) {
                await GpsHistory.create({
                    organizationId: organizationId,
                    vehicleId: vehicleId,
                    gpsDeviceId: gpsDeviceId,
                    location: dataPayload.location,
                    recordedAt: timestamp
                });
                await redisClient.set(lastHistoryKey, now);
            }

            return { success: true, message: "Data received", status: 200 };

        } catch (error) {
            console.error("Service Error:", error);
            return { success: false, message: `Server error: ${error.message}`, status: 500, error };
        }
    }
};

module.exports = Service;
