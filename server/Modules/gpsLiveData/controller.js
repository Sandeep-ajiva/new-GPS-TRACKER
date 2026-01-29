const GpsLiveData = require("./model");
const Service = require("./service");
const { getIo } = require("../../socket");
const GpsDevice = require("../gpsDevice/model");
const VehicleDeviceMapping = require("../vehicleMapping/model");

/* ========================================================================== */
/*                          AIS-140 PACKET PARSER                              */
/* ========================================================================== */

class AIS140PacketParser {
  static parsePacket(rawPacket) {
    if (!rawPacket || typeof rawPacket !== "string") {
      throw new Error("Invalid packet");
    }

    rawPacket = rawPacket.trim();
    const packetType = rawPacket.substring(1, 3);
    const parts = rawPacket.split(",");

    let checksum = null;
    if (parts[parts.length - 1].includes("*")) {
      const [last, cs] = parts[parts.length - 1].split("*");
      parts[parts.length - 1] = last;
      checksum = cs;
    }

    switch (packetType) {
      case "NR":
        return this.parseNR(parts, checksum);
      case "EA":
        return {
          ...this.parseNR(parts, checksum),
          packetType: "EA",
          emergencyStatus: true,
        };
      case "TA":
        return {
          ...this.parseNR(parts, checksum),
          packetType: "TA",
          tamperAlert: true,
        };
      case "HP":
        return { ...this.parseNR(parts, checksum), packetType: "HP" };
      case "IN":
      case "IF":
        return this.parseIgnition(parts, checksum, packetType);
      default:
        return { ...this.parseNR(parts, checksum), packetType };
    }
  }

  static parseNR(parts, checksum) {
    const latitude = this.parseCoordinate(parts[4]);
    const longitude = this.parseCoordinate(parts[6]);
    const speed = parseFloat(parts[8]) || 0;

    return {
      packetType: "NR",
      imei: parts[1],
      gpsDate: parts[2],
      gpsTime: parts[3],
      latitude,
      longitude,
      currentSpeed: speed,
      heading: parseFloat(parts[9]) || 0,
      numberOfSatellites: parseInt(parts[10]) || 0,
      ignitionStatus: parts[16]?.charAt(3) === "1",
      currentMileage: parseFloat(parts[17]) || 0,
      gpsTimestamp: this.parseGpsTimestamp(parts[2], parts[3]),
      movementStatus: this.getMovement(speed, parts[16]?.charAt(3) === "1"),
      checksum,
    };
  }

  static parseIgnition(parts, checksum, type) {
    return {
      ...this.parseNR(parts, checksum),
      packetType: type,
      ignitionStatus: type === "IN",
    };
  }

  static parseCoordinate(value) {
    if (!value) return 0;
    const v = parseFloat(value);
    const deg = Math.floor(v / 100);
    const min = v - deg * 100;
    return deg + min / 60;
  }

  static parseGpsTimestamp(date, time) {
    if (!date || !time) return new Date();
    const d = parseInt(date.slice(0, 2));
    const m = parseInt(date.slice(2, 4)) - 1;
    const y = 2000 + parseInt(date.slice(4, 6));
    const h = parseInt(time.slice(0, 2));
    const mi = parseInt(time.slice(2, 4));
    const s = parseInt(time.slice(4, 6));
    return new Date(y, m, d, h, mi, s);
  }

  static getMovement(speed, ignition) {
    if (!ignition) return "inactive";
    if (speed > 5) return "running";
    if (speed > 0) return "idle";
    return "stopped";
  }

  static validateChecksum(packet, checksum) {
    if (!checksum) return true;
    try {
      const data = packet.substring(1, packet.indexOf("*"));
      let xor = 0;
      for (let c of data) xor ^= c.charCodeAt(0);
      return (
        xor.toString(16).toUpperCase().padStart(2, "0") ===
        checksum.toUpperCase()
      );
    } catch {
      return false;
    }
  }
}

/* ========================================================================== */
/*                          GPS LIVE DATA CONTROLLER                           */
/* ========================================================================== */

const GpsLiveDataController = {
  AIS140PacketParser,

  /* ---------------------------- INGEST (HTTP) ----------------------------- */

  ingestData: async (req, res) => {
    try {
      let parsed;

      if (req.body.packet) {
        const raw = req.body.packet.trim();
        const checksum = raw.includes("*") ? raw.split("*")[1] : null;

        if (!AIS140PacketParser.validateChecksum(raw, checksum)) {
          return res
            .status(400)
            .json({ status: false, message: "Invalid checksum" });
        }

        parsed = AIS140PacketParser.parsePacket(raw);
      } else {
        parsed = {
          imei: req.body.imei,
          latitude: req.body.latitude,
          longitude: req.body.longitude,
          currentSpeed: req.body.speed || 0,
          ignitionStatus: !!req.body.ignition,
          gpsTimestamp: new Date(),
        };
      }

      const result = await Service.processGpsData(parsed);

      if (result.success) {
        await GpsLiveDataController.storeFullPacketData(parsed);
      }

      return res.json({ status: result.success, data: parsed });
    } catch (e) {
      console.error("Ingest Data Error:", e);
      return res.status(500).json({ status: false, message: e.message });
    }
  },

  /* ----------------------- STORE FULL AIS140 DATA -------------------------- */

  storeFullPacketData: async (parsed) => {
    try {
      const device = await GpsDevice.findOne({ imei: parsed.imei });
      if (!device) return;

      const mapping = await VehicleDeviceMapping.findOne({
        gpsDeviceId: device._id,
        unassignedAt: null,
      });

      const update = {
        gpsDeviceId: device._id,
        imei: parsed.imei,
        organizationId: device.organizationId,
        vehicleId: mapping?.vehicleId || null,

        packetType: parsed.packetType,
        gpsTimestamp: parsed.gpsTimestamp || new Date(),
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        currentSpeed: parsed.currentSpeed || 0,
        ignitionStatus: !!parsed.ignitionStatus,
        movementStatus: parsed.movementStatus,
        currentMileage: parsed.currentMileage,
        receivedAt: new Date(),
      };

      Object.keys(update).forEach(
        (k) => update[k] === undefined && delete update[k],
      );

      const doc = await GpsLiveData.findOneAndUpdate(
        { gpsDeviceId: device._id },
        { $set: update },
        { upsert: true, new: true },
      );

      try {
        const io = getIo();
        io.to(`device_${parsed.imei}`).emit("gps_update", doc);
        io.to(`org_${device.organizationId}`).emit("gps_update", doc);
      } catch (_) {}
    } catch (e) {
      console.error("Store packet error:", e);
    }
  },

  /* ------------------------------ GETTERS ---------------------------------- */

  getLiveData: async (req, res) => {
    const data = await GpsLiveData.find()
      .populate("vehicleId")
      .populate("gpsDeviceId");
    res.json({ status: true, data });
  },

  getByVehicle: async (req, res) => {
    const data = await GpsLiveData.findOne({ vehicleId: req.params.vehicleId });
    if (!data) return res.status(404).json({ status: false });
    res.json({ status: true, data });
  },

  getByDevice: async (req, res) => {
    const data = await GpsLiveData.findOne({
      gpsDeviceId: req.params.gpsDeviceId,
    });
    if (!data) return res.status(404).json({ status: false });
    res.json({ status: true, data });
  },

  getByImei: async (req, res) => {
    const data = await GpsLiveData.findOne({ imei: req.params.imei });
    if (!data) return res.status(404).json({ status: false });
    res.json({ status: true, data });
  },
};

module.exports = GpsLiveDataController;
