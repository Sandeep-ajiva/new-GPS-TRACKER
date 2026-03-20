/**
 * EMERGENCY HANDLER
 * Handles $EPB packets (Emergency Panic Button ON/OFF)
 */

const EmergencyEvent = require("../../Modules/emergencyEvents/model");
const GpsDevice = require("../../Modules/gpsDevice/model");

function parseNmeaCoordinate(value, direction) {
  const num = Number(value);
  if (!Number.isFinite(num) || num === 0) return null;
  const degrees = Math.floor(num / 100);
  const minutes = num - degrees * 100;
  const decimal = degrees + minutes / 60;
  const dir = String(direction || "").toUpperCase();
  return (dir === "S" || dir === "W") ? -Math.abs(decimal) : Math.abs(decimal);
}

module.exports = async function emergencyHandler(socket, packet) {
  try {
    /* ------------------------------------------------------------ */
    /* 1️⃣ BASIC SAFETY CHECK                                        */
    /* ------------------------------------------------------------ */
    if (!socket.imei || !socket.gpsDeviceId) {
      console.warn("⚠️ EPB packet before login, ignored");
      return;
    }

    /* ------------------------------------------------------------ */
    /* 2️⃣ PARSE PACKET                                              */
    /* ------------------------------------------------------------ */
    const starIdx = packet.lastIndexOf("*");
    const clean = (starIdx !== -1 ? packet.slice(0, starIdx) : packet).trim();
    const parts = clean.split(",");

    /**
     * Expected:
     * $EPB,IMEI,STATE(ON/OFF),latValue,latDir,lngValue,lngDir,speed,heading
     */
  //  AIS-140 $EPB field order:
  //   parts[0]=$EPB, parts[1]=PacketType(EMR/SEM)
  //   parts[2]=IMEI, parts[3]=PacketStatus(NM/SP)
  //   parts[4]=Date(DDMMYYYY), parts[5]=Time(HHMMSS)
  //   parts[6]=GPSFix(A=valid/V=invalid)
  //   parts[7]=Latitude, parts[8]=LatDir
  //   parts[9]=Longitude, parts[10]=LngDir
  //   parts[11]=Altitude, parts[12]=Speed

    const safeNum = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

    const packetSubType = (parts[1] || "EMR").toUpperCase();
    const imei          = parts[2];
    const packetStatus  = parts[3] || "NM";
    const gpsFix        = parts[6];
    const gpsValid      = gpsFix === "A";
    const latValue      = parts[7];
    const latDir        = parts[8];
    const lngValue      = parts[9];
    const lngDir        = parts[10];
    const speed         = safeNum(parts[12]);
    const heading       = 0;
    const state         = packetSubType === "SEM" ? "OFF" : "ON";

    const latitude = parseNmeaCoordinate(latValue, latDir);
    const longitude = parseNmeaCoordinate(lngValue, lngDir);
    const eventType = state === "OFF" ? "emergency_off" : "emergency_on";

    /* ------------------------------------------------------------ */
    /* 3️⃣ STORE EMERGENCY EVENT                                     */
    /* ------------------------------------------------------------ */
    const emergencyDoc = {
      organizationId: socket.organizationId,
      vehicleId: socket.vehicleId,
      gpsDeviceId: socket.gpsDeviceId,
      imei,
      eventType,
      latitude,
      latitudeDirection: latDir,
      longitude,
      longitudeDirection: lngDir,
      locationCoordinates: [longitude, latitude],
      speed,
      heading,
      gpsTimestamp: new Date(),
      rawPacketData: packet,
      status: eventType === "emergency_on" ? "active" : "resolved",
      receivedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(emergencyDoc).forEach(
      (k) => emergencyDoc[k] === undefined && delete emergencyDoc[k],
    );

    await EmergencyEvent.create(emergencyDoc);

    /* ------------------------------------------------------------ */
    /* 4️⃣ RESOLVE PREVIOUS EMERGENCY (if OFF)                       */
    /* ------------------------------------------------------------ */
    if (eventType === "emergency_off") {
      await EmergencyEvent.updateMany(
        {
          imei,
          eventType: "emergency_on",
          status: "active",
          _id: { $ne: emergencyDoc._id },
        },
        {
          $set: {
            status: "resolved",
            resolvedAt: new Date(),
          },
        },
      );
    }

    /* ------------------------------------------------------------ */
    /* 5️⃣ UPDATE DEVICE META                                        */
    /* ------------------------------------------------------------ */
    await GpsDevice.updateOne(
      { _id: socket.gpsDeviceId },
      {
        $set: {
          isOnline: true,
          connectionStatus: "online",
          lastSeen: new Date(),
        },
      },
    );

    /* ------------------------------------------------------------ */
    /* 6️⃣ ACK                                                       */
    /* ------------------------------------------------------------ */
    socket.write("ACK\r\n");

    console.log("🆘 EMERGENCY EVENT", {
      imei,
      eventType,
      speed,
      lat: latitude,
      lng: longitude,
    });
  } catch (err) {
    console.error("❌ Emergency handler error:", err.message);
  }
};
