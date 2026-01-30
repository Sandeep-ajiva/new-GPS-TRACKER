const GpsDevice = require("../../Modules/gpsDevice/model");
const VehicleDeviceMapping = require("../../Modules/vehicleMapping/model");

module.exports = async function loginHandler(socket, packet) {
  try {
    console.log("🔥 LOGIN HANDLER HIT");

    const clean = packet.replace("*", "");
    const parts = clean.split(",");

    const deviceIdFromPacket = parts[1];
    const imei = parts[2];
    const softwareVersion = parts[3];
    const vehicleRegNo = parts[1]; // agar packet me hai

    if (!imei || imei.length !== 15) {
      socket.write("DENY\n");
      return socket.end();
    }

    console.log("🧪 LOGIN RAW PACKET:", packet);
    console.log("🧪 PARSED PARTS:", parts);
    console.log("🧪 IMEI EXTRACTED:", imei);

    const device = await GpsDevice.findOne({ imei });

    console.log(
      "🧪 DEVICE FOUND:",
      device
        ? {
            imei: device.imei,
            status: device.status, // ✅ Fixed: was device.configuration?.status
            organizationId: device.organizationId,
          }
        : "❌ NULL - Device not in database",
    );

    if (!device) {
      console.log("❌ Device not found for IMEI:", imei);
      socket.write("DENY\n");
      return socket.end();
    }

    if (device.status !== "active") {
      console.log("❌ Device not active. Status:", device.status);
      socket.write("DENY\n");
      return socket.end();
    }

    // 🔥 Bind socket context (VERY IMPORTANT)
    socket.imei = imei;
    socket.gpsDeviceId = device._id;
    socket.organizationId = device.organizationId;
    socket.vehicleId = device.vehicleId || null;

    // Optional: resolve vehicle from mapping
    if (!socket.vehicleId) {
      const mapping = await VehicleDeviceMapping.findOne({
        gpsDeviceId: device._id,
        unassignedAt: null,
      });
      socket.vehicleId = mapping?.vehicleId || null;
    }

    // 🔥 Update GpsDevice metadata
    await GpsDevice.updateOne(
      { _id: device._id },
      {
        $set: {
          isOnline: true,
          lastLoginTime: new Date(),
          lastSeen: new Date(),
          softwareVersion,
          vehicleRegistrationNumber: vehicleRegNo,
        },
      },
    );

    console.log("✅ DEVICE LOGGED IN", {
      imei,
      org: device.organizationId,
    });

    socket.write("ON\n"); // AIS-140 safe ACK
  } catch (err) {
    console.error("❌ Login handler error:", err);
    socket.write("ERROR\n");
  }
};
