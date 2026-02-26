const Alert = require("../../Modules/alerts/model");
const GpsDevice = require("../../Modules/gpsDevice/model");
const {
  splitPacket,
  findImeiInParts,
  ensureSocketContext,
  getFallbackLive,
  parseEventState,
} = require("./_common");

module.exports = async function activationHandler(socket, packet) {
  try {
    const parts = splitPacket(packet);
    const imei = findImeiInParts(parts) || socket.imei;
    const ctx = await ensureSocketContext(socket, imei);

    if (!ctx) {
      socket.write("DENY\r\n");
      return;
    }

    const isActivated = parseEventState(parts[2], true);
    const details = parts.slice(3).join(",") || null;
    const now = new Date();

    await GpsDevice.updateOne(
      { _id: ctx.gpsDeviceId },
      {
        $set: {
          status: isActivated ? "active" : "inactive",
          isOnline: true,
          connectionStatus: "online",
          lastSeen: now,
        },
      },
    );

    const fallbackLive = await getFallbackLive(ctx.gpsDeviceId);

    await Alert.create({
      organizationId: ctx.organizationId,
      gpsDeviceId: ctx.gpsDeviceId,
      vehicleId: ctx.vehicleId || null,
      imei: ctx.imei,
      alertId: isActivated ? 6 : 3,
      alertName: isActivated ? "Main Power Connected" : "Main Power Disconnected",
      packetType: isActivated ? "BL" : "BD",
      severity: "info",
      latitude: fallbackLive?.latitude ?? null,
      longitude: fallbackLive?.longitude ?? null,
      locationCoordinates:
        fallbackLive?.latitude !== undefined &&
          fallbackLive?.latitude !== null &&
          fallbackLive?.longitude !== undefined &&
          fallbackLive?.longitude !== null
          ? [fallbackLive.longitude, fallbackLive.latitude]
          : undefined,
      gpsTimestamp: now,
      speed: Number(fallbackLive?.currentSpeed || 0),
      heading: Number(fallbackLive?.heading || 0),
      rawPacketData: `${packet} | details=${details || "NA"}`,
      receivedAt: now,
    });

    socket.write("ON\n");
  } catch (err) {
    console.error("❌ Activation handler error:", err.message);
    socket.write("ERROR\n");
  }
};

