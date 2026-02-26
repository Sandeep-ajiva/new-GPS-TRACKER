const Alert = require("../../Modules/alerts/model");
const EmergencyEvent = require("../../Modules/emergencyEvents/model");
const VehicleDailyStats = require("../../Modules/vehicleDailyStats/model");
const GpsDevice = require("../../Modules/gpsDevice/model");
const {
  splitPacket,
  findImeiInParts,
  parseCoordinate,
  ensureSocketContext,
  getFallbackLive,
  parseEventState,
} = require("./_common");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

module.exports = async function emergencyHandler(socket, packet) {
  try {
    const parts = splitPacket(packet);
    const imei = findImeiInParts(parts) || socket.imei;
    const ctx = await ensureSocketContext(socket, imei);

    if (!ctx) {
      socket.write("DENY\r\n");
      return;
    }
    if (!ctx.vehicleId) {
      console.warn("⚠️ EPB ignored: device not mapped to any vehicle", ctx.imei);
      socket.write("DENY\r\n");
      return;
    }

    const emergencyOn = parseEventState(parts[2], true);
    const fallbackLive = await getFallbackLive(ctx.gpsDeviceId);

    const latitude = parseCoordinate(parts[3], parts[4], fallbackLive?.latitude);
    const longitude = parseCoordinate(parts[5], parts[6], fallbackLive?.longitude);
    const speed = Number.isFinite(Number(parts[7]))
      ? Number(parts[7])
      : Number(fallbackLive?.currentSpeed || 0);
    const heading = Number.isFinite(Number(parts[8]))
      ? Number(parts[8])
      : Number(fallbackLive?.heading || 0);
    const now = new Date();

    // 1) Emergency event timeline row
    await EmergencyEvent.create({
      organizationId: ctx.organizationId,
      vehicleId: ctx.vehicleId,
      gpsDeviceId: ctx.gpsDeviceId,
      imei: ctx.imei,
      eventType: emergencyOn ? "emergency_on" : "emergency_off",
      latitude: latitude ?? fallbackLive?.latitude ?? 0,
      longitude: longitude ?? fallbackLive?.longitude ?? 0,
      locationCoordinates:
        latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
          ? [longitude, latitude]
          : undefined,
      gpsTimestamp: now,
      speed,
      heading,
      ignitionStatus: speed > 0,
      status: emergencyOn ? "active" : "resolved",
      rawPacketData: packet,
      receivedAt: now,
    });

    // 2) Alert row for dashboard/alerts list
    await Alert.create({
      organizationId: ctx.organizationId,
      gpsDeviceId: ctx.gpsDeviceId,
      vehicleId: ctx.vehicleId,
      imei: ctx.imei,
      alertId: emergencyOn ? 10 : 11,
      alertName: emergencyOn ? "Emergency On" : "Emergency Off",
      packetType: "EA",
      severity: emergencyOn ? "critical" : "info",
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      locationCoordinates:
        latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
          ? [longitude, latitude]
          : undefined,
      gpsTimestamp: now,
      speed,
      heading,
      emergencyStatus: emergencyOn,
      rawPacketData: packet,
      receivedAt: now,
    });

    // 3) Daily stats emergency counter
    if (emergencyOn && ctx.vehicleId) {
      await VehicleDailyStats.updateOne(
        { vehicleId: ctx.vehicleId, date: startOfToday() },
        { $inc: { "alertCounts.emergencyCount": 1 } },
      );
    }

    await GpsDevice.updateOne(
      { _id: ctx.gpsDeviceId },
      {
        $set: {
          isOnline: true,
          connectionStatus: "online",
          lastSeen: now,
        },
      },
    );

    socket.write("ACK\n");
  } catch (err) {
    console.error("❌ Emergency handler error:", err.message);
    socket.write("ERROR\n");
  }
};
