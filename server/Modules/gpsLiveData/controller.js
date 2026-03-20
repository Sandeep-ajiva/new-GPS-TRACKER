const GpsLiveData = require("./model");
const Service = require("./service");
const { getIo } = require("../../socket");
const GpsDevice = require("../gpsDevice/model");
const VehicleDeviceMapping = require("../deviceMapping/model");

/* ========================================================================== */
/*                          AIS-140 PACKET PARSER                              */
/* ========================================================================== */

class AIS140PacketParser {
  static parsePacket(rawPacket) {
    if (!rawPacket || typeof rawPacket !== "string") {
      throw new Error("Invalid packet");
    }

    rawPacket = rawPacket.trim();
    const parts = rawPacket.split(",");

    let checksum = null;
    if (parts[parts.length - 1].includes("*")) {
      const [last, cs] = parts[parts.length - 1].split("*");
      parts[parts.length - 1] = last;
      checksum = cs;
    }

    // AIS-140: packetType is at parts[3] (NR/EA/TA/HP/IN/IF)
    // Header is always $NRM for location packets
    const packetType = (parts[3] || "").trim().toUpperCase();

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
        return { ...this.parseNR(parts, checksum), packetType: "IN", ignitionStatus: true };
      case "IF":
        return { ...this.parseNR(parts, checksum), packetType: "IF", ignitionStatus: false };
      default:
        return { ...this.parseNR(parts, checksum), packetType: packetType || "NR" };
    }
  }

 static parseNR(parts, checksum) {
    // ─── AIS-140 OFFICIAL FIELD INDICES ───
    // parts[0]  = $NRM
    // parts[1]  = VendorID
    // parts[2]  = SoftwareVersion
    // parts[3]  = PacketType (NR/EA/TA/HP/IN/IF)
    // parts[4]  = AlertID
    // parts[5]  = PacketStatus (L/H)
    // parts[6]  = IMEI
    // parts[7]  = VehicleRegNo
    // parts[8]  = GPSFix (1=valid, 0=invalid)
    // parts[9]  = Date (DDMMYYYY)
    // parts[10] = Time (HHMMSS)
    // parts[11] = Latitude
    // parts[12] = LatDir (N/S)
    // parts[13] = Longitude
    // parts[14] = LngDir (E/W)
    // parts[15] = Speed
    // parts[16] = Heading
    // parts[17] = NumSatellites
    // parts[18] = Altitude
    // parts[19] = PDOP
    // parts[20] = HDOP
    // parts[21] = OperatorName
    // parts[22] = Ignition (1/0)
    // parts[23] = MainPowerStatus (1/0)
    // parts[24] = MainInputVoltage
    // parts[25] = InternalBatteryVoltage
    // parts[26] = EmergencyStatus (0/1)
    // parts[27] = TamperAlert (O/C)
    // parts[28] = GSMStrength
    // parts[29] = MCC
    // parts[30] = MNC

    const gpsFix = parts[8];
    const gpsValid = gpsFix === "1";

    const speed = this.parseNumber(parts[15], 0);
    const ignitionStatus = parts[22] === "1";
    const mainPowerStatus = parts[23] === "1"
      ? true
      : parts[23] === "0"
        ? false
        : null;

    const mainInputVoltage        = this.parseOptionalNumber(parts[24]);
    const internalBatteryVoltage  = this.parseOptionalNumber(parts[25]);
    const batteryLevel            = this.parseOptionalNumber(parts[35]);
    const gsmSignalStrength       = this.parseOptionalNumber(parts[28]);
    const fuelPercentage          = this.parseOptionalNumber(parts[36]);
    const temperature             = typeof parts[37] === "string" && parts[37].trim()
      ? parts[37].trim()
      : null;

    // Only parse coordinates if GPS fix is valid
    const latitude  = gpsValid ? this.parseCoordinate(parts[11], parts[12]) : null;
    const longitude = gpsValid ? this.parseCoordinate(parts[13], parts[14]) : null;

    return {
      packetType:            parts[3] || "NR",
      alertId:               this.parseOptionalNumber(parts[4]),
      packetStatus:          parts[5] || "L",
      imei:                  parts[6],
      vehicleRegNo:          parts[7] || null,
      gpsFix:                gpsValid,
      gpsDate:               parts[9],
      gpsTime:               parts[10],
      latitude,
      latitudeDirection:     parts[12] || null,
      longitude,
      longitudeDirection:    parts[14] || null,
      currentSpeed:          speed,
      heading:               this.parseNumber(parts[16], 0),
      numberOfSatellites:    this.parseNumber(parts[17], 0),
      altitude:              this.parseOptionalNumber(parts[18]),
      pdop:                  this.parseOptionalNumber(parts[19]),
      hdop:                  this.parseOptionalNumber(parts[20]),
      operatorName:          typeof parts[21] === "string" && parts[21].trim() ? parts[21].trim() : null,
      ignitionStatus,
      mainPowerStatus,
      mainInputVoltage,
      internalBatteryVoltage,
      emergencyStatus:       parts[26] === "1",
      tamperAlert:           parts[27] || "C",
      gsmSignalStrength,
      mcc:                   typeof parts[29] === "string" && parts[29].trim() ? parts[29].trim() : null,
      batteryLevel,
      gsmStrength:           gsmSignalStrength,
      fuelPercentage,
      temperature,
      digitalInputStatus:    parts[33] || null,
      currentMileage:        this.parseNumber(parts[39], 0),
      gpsTimestamp:          this.parseGpsTimestamp(parts[9], parts[10]),
      movementStatus:        this.getMovement(speed, ignitionStatus),
      checksum,
    };
  }

  static parseCoordinate(value, direction) {
    if (!value || value === "0" || value === "") return null;
    const v = this.parseNumber(value, NaN);
    if (!Number.isFinite(v) || v === 0) return null;
    const deg = Math.floor(v / 100);
    const min = v - deg * 100;
    const signed = deg + min / 60;
    if (!Number.isFinite(signed)) return null;
    return (direction === "S" || direction === "W") ? -Math.abs(signed) : Math.abs(signed);
  }

  static parseNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  static parseOptionalNumber(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  static parseGpsTimestamp(date, time) {
    try {
      if (!date || !time || date.length < 6 || time.length < 6) return new Date();
      const d  = parseInt(date.slice(0, 2), 10);
      const mo = parseInt(date.slice(2, 4), 10) - 1;
      // AIS-140 spec: DDMMYYYY (8 digits) — last 4 digits are full year
      const y  = date.length >= 8
        ? parseInt(date.slice(4, 8), 10)
        : 2000 + parseInt(date.slice(4, 6), 10);
      const h = parseInt(time.slice(0, 2), 10);
      const mi = parseInt(time.slice(2, 4), 10);
      const s = parseInt(time.slice(4, 6), 10);
      if ([d, mo, y, h, mi, s].some(n => !Number.isFinite(n))) return new Date();
      const ts = new Date(Date.UTC(y, mo, d, h, mi, s));
      // Reject future timestamps (GPS clock drift / wrong format)
      if (ts > Date.now() + 60_000) return new Date();
      return ts;
    } catch { return new Date(); }
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
      } catch (_) { }
    } catch (e) {
      console.error("Store packet error:", e);
    }
  },

  /* ------------------------------ GETTERS ---------------------------------- */

  getLiveData: async (req, res) => {
    const filter = {};
    // 🔐 ORG SCOPE FIX (handles unauthenticated/system calls too)
    const role = req.user?.role;
    const scope = req.orgScope;
    if (role && role !== "superadmin" && scope && scope !== "ALL") {
      filter.organizationId = { $in: scope };
    }
    try {
      const data = await GpsLiveData.find(filter)
        .populate("vehicleId", "registrationNumber vehicleType")
        .populate("gpsDeviceId", "imei status")
        .limit(500)
        .lean();
      res.json({ status: true, data });
    } catch (e) {
      console.error("getLiveData error:", e);
      res.status(500).json({ status: false, message: e.message });
    }
  },
  getByVehicle: async (req, res) => {
    const filter = { vehicleId: req.params.vehicleId };
    // 🔐 ORG SCOPE FIX
    const role = req.user?.role;
    const scope = req.orgScope;
    if (role && role !== "superadmin" && scope && scope !== "ALL") {
      filter.organizationId = { $in: scope };
    }
    try {
      const data = await GpsLiveData.findOne(filter);
      if (!data) return res.status(404).json({ status: false, message: "Details not found." });
      res.json({ status: true, data });
    } catch (e) {
      res.status(500).json({ status: false, message: e.message });
    }
  },

  getByDevice: async (req, res) => {
    const filter = { gpsDeviceId: req.params.gpsDeviceId };
    // 🔐 ORG SCOPE FIX
    const role = req.user?.role;
    const scope = req.orgScope;
    if (role && role !== "superadmin" && scope && scope !== "ALL") {
      filter.organizationId = { $in: scope };
    }
       try {
      const data = await GpsLiveData.findOne(filter);
      if (!data) return res.status(404).json({ status: false });
      res.json({ status: true, data });
    } catch (e) {
      res.status(500).json({ status: false, message: e.message });
    }
  },

  getByImei: async (req, res) => {
    const filter = { imei: req.params.imei };
    // 🔐 ORG SCOPE FIX
    const role = req.user?.role;
    const scope = req.orgScope;
    if (role && role !== "superadmin" && scope && scope !== "ALL") {
      filter.organizationId = { $in: scope };
    }
    try {
      const data = await GpsLiveData.findOne(filter);
      if (!data) return res.status(404).json({ status: false });
      res.json({ status: true, data });
    } catch (e) {
      res.status(500).json({ status: false, message: e.message });
    }
  },
};

module.exports = GpsLiveDataController;
