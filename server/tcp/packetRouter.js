const PACKET_TYPES = require("./packetTypes");

// handlers import
const loginHandler = require("./handlers/loginHandler");
const healthHandler = require("./handlers/health.handler");
const normalHandler = require("./handlers/normal.handler");
const alertHandler = require("./handlers/alert.handler");
const emergencyHandler = require("./handlers/emergency.handler");
const otaHandler = require("./handlers/ota.handler");
const activationHandler = require("./handlers/activation.handler");

/**
 * Packet type → handler map
 * This is the heart of routing
 */
const PACKET_HANDLER_MAP = {
  [PACKET_TYPES.LOGIN]: loginHandler,
  [PACKET_TYPES.HEALTH]: healthHandler,
  [PACKET_TYPES.NORMAL]: normalHandler,
  [PACKET_TYPES.ALERT]: alertHandler,
  [PACKET_TYPES.EMERGENCY]: emergencyHandler,
  [PACKET_TYPES.OTA]: otaHandler,
  [PACKET_TYPES.ACTIVATION]: activationHandler,
};

/**
 * packetRouter
 * @param {Socket} socket  - TCP socket of device
 * @param {String} packet  - complete packet string
 */
async function packetRouter(socket, packet) {
  try {
    if (!packet || typeof packet !== "string") return;

    // packet type is always first value
    const packetType = packet.split(",")[0];

    const handler = PACKET_HANDLER_MAP[packetType];

    if (!handler) {
      console.warn("⚠️ Unknown packet type:", packetType, packet);
      return;
    }

    // forward packet to correct handler
    await handler(socket, packet);
  } catch (err) {
    console.error("❌ packetRouter error:", err.message);
  }
}

module.exports = packetRouter;
