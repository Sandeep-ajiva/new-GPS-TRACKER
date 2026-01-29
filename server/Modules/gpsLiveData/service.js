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
   * Unified GPS data processor
   * Source: TCP / HTTP / MQTT
   */
  processGpsData: async (data, overrides = {}) => {
    try {
      /* ------------------------------------------------------------------ */
      /* 1️⃣ NORMALIZE INPUT                                                  */
      /* ------------------------------------------------------------------ */

      const imei = data.imei;
      const latitude = data.latitude ?? data.lat ?? null;
      const longitude = data.longitude ?? data.lng ?? null;
      const speed = parseFloat(data.currentSpeed ?? data.speed ?? 0);
      const ignition = !!(data.ignitionStatus ?? data.ignition);

      if (!imei || latitude === null || longitude === null) {
        return {
          success: false,
          message: "Missing required fields (imei, latitude, longitude)",
          status: 400,
        };
      }

      let { organizationId, vehicleId } = data;

      if (overrides.organizationId) organizationId = overrides.organizationId;
      if (overrides.vehicleId) vehicleId = overrides.vehicleId;

      /* ------------------------------------------------------------------ */
      /* 2️⃣ DEVICE + MAPPING RESOLUTION (REDIS FIRST)                        */
      /* ------------------------------------------------------------------ */

      let gpsDeviceId;

      const cacheKey = `device_meta:${imei}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        gpsDeviceId = parsed._id;
        organizationId = parsed.organizationId;
        vehicleId = parsed.vehicleId;
      } else {
        const device = await GpsDevice.findOne({ imei });
        if (!device) {
          return { success: false, message: "Device not found", status: 404 };
        }

        gpsDeviceId = device._id;
        organizationId = device.organizationId;

        const mapping = await VehicleDeviceMapping.findOne({
          gpsDeviceId,
          unassignedAt: null,
        });

        vehicleId = mapping ? mapping.vehicleId : null;

        await redisClient.setex(
          cacheKey,
          3600,
          JSON.stringify({
            _id: gpsDeviceId,
            organizationId,
            vehicleId,
          }),
        );
      }

      if (!organizationId || !vehicleId) {
        return {
          success: false,
          message: "Device not assigned to any vehicle",
          status: 400,
        };
      }

      const timestamp = new Date();

      /* ------------------------------------------------------------------ */
      /* 3️⃣ MOVEMENT STATUS (STANDARDIZED)                                   */
      /* ------------------------------------------------------------------ */

      let movementStatus = "inactive";
      if (ignition) {
        if (speed > 5) movementStatus = "running";
        else if (speed > 0) movementStatus = "idle";
        else movementStatus = "stopped";
      }

      /* ------------------------------------------------------------------ */
      /* 4️⃣ SOCKET.IO BROADCAST                                               */
      /* ------------------------------------------------------------------ */

      let io;
      try {
        io = getIo();
      } catch {
        io = null;
      }

      const socketPayload = {
        imei,
        organizationId,
        vehicleId,
        gpsDeviceId,
        latitude,
        longitude,
        speed,
        ignition,
        movementStatus,
        updatedAt: timestamp,
      };

      if (io) {
        io.to(`device_${imei}`).emit("gps_update", socketPayload);
        io.to(`org_${organizationId}`).emit("gps_update", socketPayload);
      }

      /* ------------------------------------------------------------------ */
      /* 5️⃣ UPDATE LIVE DATA                                                  */
      /* ------------------------------------------------------------------ */

      const prev = await GpsLiveData.findOne({ gpsDeviceId });

      const liveUpdate = {
        imei,
        organizationId,
        vehicleId,
        gpsDeviceId,
        latitude,
        longitude,
        currentSpeed: speed,
        ignitionStatus: ignition,
        movementStatus,
        updatedAt: timestamp,
      };

      if (ignition && !(prev && prev.ignitionStatus)) {
        liveUpdate.lastIgnitionOn = timestamp;
      }
      if (!ignition && prev && prev.ignitionStatus) {
        liveUpdate.lastIgnitionOff = timestamp;
      }

      await GpsLiveData.findOneAndUpdate(
        { gpsDeviceId },
        { $set: { ...liveUpdate, gpsTimestamp: timestamp } },
        { upsert: true, new: true },
      );

      /* ------------------------------------------------------------------ */
      /* 6️⃣ GPS HISTORY (THROTTLED)                                           */
      /* ------------------------------------------------------------------ */

      const historyKey = `gps_history:${imei}`;
      const last = await redisClient.get(historyKey);

      if (!last || Date.now() - parseInt(last) >= 4000) {
        await GpsHistory.create({
          organizationId,
          vehicleId,
          gpsDeviceId,
          imei,
          latitude,
          longitude,
          speed,
          gpsTimestamp: timestamp,
        });
        await redisClient.set(historyKey, Date.now());
      }

      /* ------------------------------------------------------------------ */
      /* 7️⃣ VEHICLE DAILY STATS                                               */
      /* ------------------------------------------------------------------ */

      const day = new Date();
      day.setHours(0, 0, 0, 0);

      let stats = await VehicleDailyStats.findOne({
        vehicleId,
        date: day,
      });

      if (!stats) {
        stats = await VehicleDailyStats.create({
          organizationId,
          vehicleId,
          gpsDeviceId,
          date: day,
          totalDistance: 0,
          maxSpeed: speed,
          avgSpeed: 0,
          runningTime: movementStatus === "running" ? 1 : 0,
          idleTime: movementStatus === "idle" ? 1 : 0,
          stoppedTime: movementStatus === "stopped" ? 1 : 0,
          firstIgnitionOn: ignition ? timestamp : null,
        });
      } else {
        const inc = {};
        if (movementStatus === "running") inc.runningTime = 1;
        if (movementStatus === "idle") inc.idleTime = 1;
        if (movementStatus === "stopped") inc.stoppedTime = 1;

        await VehicleDailyStats.updateOne(
          { _id: stats._id },
          {
            $inc: inc,
            $max: { maxSpeed: speed },
          },
        );
      }

      /* ------------------------------------------------------------------ */
      /* 8️⃣ ALERTS (OVERSPEED / BATTERY / IGNITION)                          */
      /* ------------------------------------------------------------------ */

      try {
        const orgCacheKey = `org_settings:${organizationId}`;
        let orgSettings = await redisClient.get(orgCacheKey);

        if (!orgSettings) {
          const org = await Organization.findById(organizationId)
            .select("settings")
            .lean();
          orgSettings = org?.settings || {};
          await redisClient.setex(orgCacheKey, 60, JSON.stringify(orgSettings));
        } else {
          orgSettings = JSON.parse(orgSettings);
        }

        const SPEED_LIMIT = orgSettings.speedLimit ?? 80;
        const LOW_BATTERY = orgSettings.lowBatteryThreshold ?? 20;

        if (speed > SPEED_LIMIT) {
          await Alert.create({
            organizationId,
            gpsDeviceId,
            vehicleId,
            type: "overspeed",
            message: `Speed ${speed} km/h exceeded ${SPEED_LIMIT}`,
            locationCoordinates: [longitude, latitude],
          });
        }

        if (
          typeof data.batteryLevel === "number" &&
          data.batteryLevel <= LOW_BATTERY
        ) {
          await Alert.create({
            organizationId,
            gpsDeviceId,
            vehicleId,
            type: "low_battery",
            message: `Battery low: ${data.batteryLevel}%`,
            locationCoordinates: [longitude, latitude],
          });
        }
      } catch (e) {
        console.error("Alert error:", e);
      }

      return { success: true, message: "GPS data processed", status: 200 };
    } catch (error) {
      console.error("Service Error:", error);
      return {
        success: false,
        message: error.message,
        status: 500,
      };
    }
  },
};

module.exports = Service;
