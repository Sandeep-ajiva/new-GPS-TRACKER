const Alert = require("../../Modules/alerts/model");
const GpsDevice = require("../../Modules/gpsDevice/model");
const { mapAlertType } = require("../../common/utils");
const {
  splitPacket,
  findImeiInParts,
  parseCoordinate,
  ensureSocketContext,
  getFallbackLive,
} = require("./_common");

const ALERT_ID_MAP = {
  3: { alertId: 3, alertName: "Main Power Disconnected", packetType: "BD" },
  4: { alertId: 4, alertName: "Low Battery", packetType: "BD" },
  5: { alertId: 5, alertName: "Low Battery Removed", packetType: "BR" },
  6: { alertId: 6, alertName: "Main Power Connected", packetType: "BL" },
  7: { alertId: 7, alertName: "Ignition On", packetType: "IN" },
  8: { alertId: 8, alertName: "Ignition Off", packetType: "IF" },
  9: { alertId: 9, alertName: "Tamper Alert", packetType: "TA" },
  10: { alertId: 10, alertName: "Emergency On", packetType: "EA" },
  11: { alertId: 11, alertName: "Emergency Off", packetType: "EA" },
  12: { alertId: 12, alertName: "OTA Alert", packetType: "OA" },
  13: { alertId: 13, alertName: "Harsh Braking", packetType: "HB" },
  14: { alertId: 14, alertName: "Harsh Acceleration", packetType: "HA" },
  15: { alertId: 15, alertName: "Rash Turning", packetType: "RT" },
  16: { alertId: 16, alertName: "Wire Disconnect", packetType: "WD" },
  17: { alertId: 17, alertName: "Overspeed", packetType: "OS" },
  22: { alertId: 22, alertName: "Tilt Alert", packetType: "TI" },
};

function resolveAlertMeta(rawIdentifier) {
  const trimmed = String(rawIdentifier || "").trim();
  if (!trimmed) return ALERT_ID_MAP[9];

  const maybeId = Number(trimmed);
  if (Number.isInteger(maybeId) && ALERT_ID_MAP[maybeId]) {
    return ALERT_ID_MAP[maybeId];
  }

  const key = trimmed.toLowerCase();
  const keyMap = {
    overspeed: "overspeed",
    low_battery: "low_battery",
    battery_removed: "battery_removed",
    main_power_off: "main_power_off",
    main_power_on: "main_power_on",
    ignition_on: "ignition_on",
    ignition_off: "ignition_off",
    tamper: "tamper_alert",
    tamper_alert: "tamper_alert",
    emergency_on: "emergency_on",
    emergency_off: "emergency_off",
    harsh_braking: "harsh_braking",
    harsh_acceleration: "harsh_acceleration",
    rash_turning: "rash_turning",
    wire_disconnect: "wire_disconnect",
    tilt: "tilt_alert",
    tilt_alert: "tilt_alert",
    ota: "ota_alert",
  };

  if (keyMap[key] === "ota_alert") return ALERT_ID_MAP[12];
  if (keyMap[key]) return mapAlertType(keyMap[key]);

  return ALERT_ID_MAP[9];
}

module.exports = async function alertHandler(socket, packet) {
  try {
    const parts = splitPacket(packet);
    const imei = findImeiInParts(parts) || socket.imei;
    const ctx = await ensureSocketContext(socket, imei);

    if (!ctx) {
      socket.write("DENY\r\n");
      return;
    }

    const alertIdentifier = parts[2];
    const alertMeta = resolveAlertMeta(alertIdentifier);

    const fallbackLive = await getFallbackLive(ctx.gpsDeviceId);

    const latitude = parseCoordinate(parts[3], parts[4], fallbackLive?.latitude);
    const longitude = parseCoordinate(parts[5], parts[6], fallbackLive?.longitude);
    const speed = Number.isFinite(Number(parts[7]))
      ? Number(parts[7])
      : Number(fallbackLive?.currentSpeed || 0);
    const heading = Number.isFinite(Number(parts[8]))
      ? Number(parts[8])
      : Number(fallbackLive?.heading || 0);
    const rawSeverity = String(parts[9] || "").toLowerCase();
    const severity = ["info", "warning", "critical"].includes(rawSeverity)
      ? rawSeverity
      : "warning";

    await Alert.create({
      organizationId: ctx.organizationId,
      gpsDeviceId: ctx.gpsDeviceId,
      vehicleId: ctx.vehicleId || null,
      imei: ctx.imei,
      alertId: alertMeta.alertId,
      alertName: alertMeta.alertName,
      packetType: alertMeta.packetType,
      severity,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      locationCoordinates:
        latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
          ? [longitude, latitude]
          : undefined,
      gpsTimestamp: new Date(),
      speed,
      heading,
      rawPacketData: packet,
      receivedAt: new Date(),
    });

    await GpsDevice.updateOne(
      { _id: ctx.gpsDeviceId },
      {
        $set: {
          isOnline: true,
          connectionStatus: "online",
          lastSeen: new Date(),
        },
      },
    );

    socket.write("ACK\n");
  } catch (err) {
    console.error("❌ Alert handler error:", err.message);
    socket.write("ERROR\n");
  }
};

