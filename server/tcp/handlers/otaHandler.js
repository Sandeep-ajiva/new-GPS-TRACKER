const Alert = require("../../Modules/alerts/model");
const GpsDevice = require("../../Modules/gpsDevice/model");
const {
  splitPacket,
  findImeiInParts,
  ensureSocketContext,
  getFallbackLive,
} = require("./_common");

function parseOtaStatus(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "unknown";
  if (["SUCCESS", "OK", "DONE", "COMPLETE", "1"].includes(raw)) return "success";
  if (["FAIL", "FAILED", "ERROR", "0"].includes(raw)) return "failed";
  return raw.toLowerCase();
}

module.exports = async function otaHandler(socket, packet) {
  try {
    const parts = splitPacket(packet);
    const imei = findImeiInParts(parts) || socket.imei;
    const ctx = await ensureSocketContext(socket, imei);

    if (!ctx) {
      socket.write("DENY\r\n");
      return;
    }

    const otaStatus = parseOtaStatus(parts[2]);
    const fromVersion = parts[3] || null;
    const toVersion = parts[4] || null;
    const details = parts.slice(5).join(",") || null;
    const now = new Date();

    const fallbackLive = await getFallbackLive(ctx.gpsDeviceId);

    if (toVersion && otaStatus === "success") {
      await GpsDevice.updateOne(
        { _id: ctx.gpsDeviceId },
        {
          $set: {
            softwareVersion: toVersion,
            isOnline: true,
            connectionStatus: "online",
            lastSeen: now,
          },
        },
      );
    } else {
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
    }

    await Alert.create({
      organizationId: ctx.organizationId,
      gpsDeviceId: ctx.gpsDeviceId,
      vehicleId: ctx.vehicleId || null,
      imei: ctx.imei,
      alertId: 12,
      alertName: "OTA Alert",
      packetType: "OA",
      severity: otaStatus === "failed" ? "warning" : "info",
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
      rawPacketData: `${packet} | status=${otaStatus} from=${fromVersion || "NA"} to=${toVersion || "NA"} details=${details || "NA"}`,
      receivedAt: now,
    });

    socket.write("OK\n");
  } catch (err) {
    console.error("❌ OTA handler error:", err.message);
    socket.write("ERROR\n");
  }
};

