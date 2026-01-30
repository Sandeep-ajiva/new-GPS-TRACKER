/**
 * LOCATION HANDLER
 * Handles $NRM packets (Normal Location)
 */

const Service = require("../../Modules/gpsLiveData/service");
const { AIS140PacketParser } = require("../../Modules/gpsLiveData/controller");

module.exports = async function locationHandler(socket, packet) {
  try {
    /* ---------------------------------------------------- */
    /* 1️⃣ LOGIN CHECK                                       */
    /* ---------------------------------------------------- */

    if (!socket.imei || !socket.gpsDeviceId) {
      console.warn("⚠️ NRM packet before login, ignored");
      return;
    }

    /* ---------------------------------------------------- */
    /* 2️⃣ PARSE PACKET                                      */
    /* ---------------------------------------------------- */

    let parsed;
    try {
      parsed = AIS140PacketParser.parsePacket(packet);
    } catch (e) {
      console.error("❌ NRM parse failed:", e.message);
      return;
    }

    /* ---------------------------------------------------- */
    /* 3️⃣ ADD SOCKET CONTEXT                                */
    /* ---------------------------------------------------- */

    parsed.imei = socket.imei;
    parsed.organizationId = socket.organizationId;
    parsed.vehicleId = socket.vehicleId;
    parsed.gpsDeviceId = socket.gpsDeviceId;

    /* ---------------------------------------------------- */
    /* 4️⃣ HAND OVER TO SERVICE                              */
    /* ---------------------------------------------------- */

    const result = await Service.processGpsData(parsed, {
      organizationId: socket.organizationId,
      vehicleId: socket.vehicleId,
    });

    if (result?.success) {
      socket.write("ACK\n");
    }
  } catch (err) {
    console.error("❌ Location handler error:", err.message);
  }
};
