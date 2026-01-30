/**
 * HEALTH HANDLER
 * Handles $HLM packets (Health Monitoring)
 */

const HealthMonitoring = require("../../Modules/healthMonitoring/model");
const GpsDevice = require("../../Modules/gpsDevice/model");

module.exports = async function healthHandler(socket, packet) {
  try {
    /* ------------------------------------------------------------ */
    /* 1️⃣ BASIC SAFETY CHECK                                        */
    /* ------------------------------------------------------------ */

    // Device must be logged in
    console.log("🔥 LOGIN HANDLER HIT");
    if (!socket.imei || !socket.gpsDeviceId) {
      console.warn("⚠️ Health packet before login, ignored");
      return;
    }

    /* ------------------------------------------------------------ */
    /* 2️⃣ CLEAN + SPLIT PACKET                                      */
    /* ------------------------------------------------------------ */

    const cleanPacket = packet.replace("*", "");
    const parts = cleanPacket.split(",");

    /**
     * Expected (example):
     * $HLM,VENDOR,VERSION,IMEI,BATTERY,LOW_BAT, MEMORY,
     *      RATE_ON,RATE_OFF,DIN,AIN
     */
    const vendorId = parts[1];
    const softwareVersion = parts[2];
    const imei = parts[3];

    const batteryPercentage = Number(parts[4]);
    const lowBatteryThreshold = Number(parts[5]);
    const memoryPercentage = Number(parts[6]);

    const dataUpdateRateIgnitionOn = Number(parts[7]);
    const dataUpdateRateIgnitionOff = Number(parts[8]);

    const digitalInputStatus = parts[9];
    const analogInputStatus = parts[10];

    /* ------------------------------------------------------------ */
    /* 3️⃣ BUILD HEALTH DOCUMENT                                     */
    /* ------------------------------------------------------------ */

    const healthDoc = {
      imei,
      gpsDeviceId: socket.gpsDeviceId,
      organizationId: socket.organizationId,
      vehicleId: socket.vehicleId || null,

      vendorId,
      softwareVersion,

      batteryPercentage,
      lowBatteryThreshold,
      memoryPercentage,

      dataUpdateRateIgnitionOn,
      dataUpdateRateIgnitionOff,

      digitalInputStatus,
      analogInputStatus,

      timestamp: new Date(),
      receivedAt: new Date(),
    };

    // Remove undefined fields safely
    Object.keys(healthDoc).forEach(
      (k) => healthDoc[k] === undefined && delete healthDoc[k],
    );

    /* ------------------------------------------------------------ */
    /* 4️⃣ STORE HEALTH SNAPSHOT                                     */
    /* ------------------------------------------------------------ */

    await HealthMonitoring.create(healthDoc);

    /* ------------------------------------------------------------ */
    /* 5️⃣ UPDATE DEVICE META (OPTIONAL BUT IMPORTANT)               */
    /* ------------------------------------------------------------ */

    await GpsDevice.updateOne(
      { _id: socket.gpsDeviceId },
      {
        $set: {
          lastSeen: new Date(),
          softwareVersion,
        },
      },
    );

    /* ------------------------------------------------------------ */
    /* 6️⃣ ACK DEVICE                                                */
    /* ------------------------------------------------------------ */

    socket.write("OK\n");

    console.log("❤️ HEALTH UPDATED", {
      imei,
      battery: batteryPercentage,
      memory: memoryPercentage,
    });
  } catch (err) {
    console.error("❌ Health handler error:", err.message);
  }
};
