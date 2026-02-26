const DEFAULT_SOFTWARE_VERSION = "2.5AIS";
const DEFAULT_VENDOR = "ROADRPA";
const DEFAULT_MCC = "404";

function pad2(v) {
  return String(v).padStart(2, "0");
}

function toNmeaCoordinate(decimal, isLat) {
  const abs = Math.abs(Number(decimal));
  const degrees = Math.floor(abs);
  const minutes = (abs - degrees) * 60;
  const ddmm = degrees * 100 + minutes;

  return {
    value: ddmm.toFixed(4),
    direction:
      isLat
        ? Number(decimal) >= 0
          ? "N"
          : "S"
        : Number(decimal) >= 0
          ? "E"
          : "W",
  };
}

function buildGpsDateTimeParts(date = new Date()) {
  const d = new Date(date);
  const dd = pad2(d.getDate());
  const mm = pad2(d.getMonth() + 1);
  const yy = pad2(d.getFullYear() % 100);
  const hh = pad2(d.getHours());
  const mi = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());

  // Parser expects DDMMYY and HHMMSS.
  return {
    gpsDate: `${dd}${mm}${yy}`,
    gpsTime: `${hh}${mi}${ss}`,
  };
}

function calculateChecksum(packetBody) {
  let xor = 0;
  for (let i = 0; i < packetBody.length; i += 1) {
    xor ^= packetBody.charCodeAt(i);
  }
  return xor.toString(16).toUpperCase().padStart(2, "0");
}

function withChecksum(packetBody) {
  const checksum = calculateChecksum(packetBody);
  return `$${packetBody}*${checksum}\n`;
}

function validateImei(imei) {
  if (!imei || String(imei).length !== 15) {
    throw new Error(`Invalid IMEI: ${imei}`);
  }
}

function buildLoginPacket({
  imei,
  vehicleNo,
  softwareVersion = DEFAULT_SOFTWARE_VERSION,
}) {
  validateImei(imei);
  if (!vehicleNo) throw new Error("vehicleNo is required for login packet");

  return `$LGN,${vehicleNo},${imei},${softwareVersion}\n`;
}

function buildHealthPacket({
  imei,
  vendorId = DEFAULT_VENDOR,
  softwareVersion = DEFAULT_SOFTWARE_VERSION,
  batteryPercentage = 85,
  lowBatteryThreshold = 20,
  memoryPercentage = 35,
  dataUpdateRateIgnitionOn = 60,
  dataUpdateRateIgnitionOff = 60,
  digitalInputStatus = "0000",
  analogInputStatus = "00",
}) {
  validateImei(imei);

  const body = [
    "HLM",
    vendorId,
    softwareVersion,
    imei,
    Number(batteryPercentage),
    Number(lowBatteryThreshold),
    Number(memoryPercentage),
    Number(dataUpdateRateIgnitionOn),
    Number(dataUpdateRateIgnitionOff),
    digitalInputStatus,
    analogInputStatus,
  ].join(",");

  // Current health handler does not require checksum.
  return `$${body}\n`;
}

function buildStatusField({ ignition = true } = {}) {
  // Parser checks charAt(3). "000100" => ignition ON.
  return ignition ? "000100" : "000000";
}

function buildNrmPacket({
  imei,
  latitude,
  longitude,
  speed = 35,
  heading = 90,
  numberOfSatellites = 9,
  altitude = 320,
  pdop = 1.1,
  hdop = 0.9,
  operatorName = "Airtel",
  mcc = DEFAULT_MCC,
  ignition = true,
  currentMileage = 15000,
  mainInputVoltage = 12.6,
  at = new Date(),
}) {
  validateImei(imei);

  if (latitude === undefined || longitude === undefined) {
    throw new Error("latitude and longitude are required for NRM packet");
  }

  const { gpsDate, gpsTime } = buildGpsDateTimeParts(at);
  const lat = toNmeaCoordinate(latitude, true);
  const lng = toNmeaCoordinate(longitude, false);
  const statusField = buildStatusField({ ignition });

  const body = [
    "NRM",
    imei,
    gpsDate,
    gpsTime,
    lat.value,
    lat.direction,
    lng.value,
    lng.direction,
    Number(speed).toFixed(1),
    Number(heading).toFixed(1),
    String(Math.max(0, Number(numberOfSatellites))),
    String(Number(altitude)),
    String(Number(pdop)),
    String(Number(hdop)),
    operatorName,
    mcc,
    statusField,
    String(Number(currentMileage)),
    String(Number(mainInputVoltage)),
  ].join(",");

  return withChecksum(body);
}

function buildAlertPacket({
  imei,
  alertIdentifier = "overspeed",
  latitude,
  longitude,
  speed = 0,
  heading = 0,
  severity = "warning",
  message = "",
}) {
  validateImei(imei);
  if (latitude === undefined || longitude === undefined) {
    throw new Error("latitude and longitude are required for ALT packet");
  }

  const lat = toNmeaCoordinate(latitude, true);
  const lng = toNmeaCoordinate(longitude, false);

  return `$ALT,${imei},${alertIdentifier},${lat.value},${lat.direction},${lng.value},${lng.direction},${Number(speed).toFixed(1)},${Number(heading).toFixed(1)},${severity},${message}\n`;
}

function buildEmergencyPacket({
  imei,
  state = "ON",
  latitude,
  longitude,
  speed = 0,
  heading = 0,
}) {
  validateImei(imei);
  if (latitude === undefined || longitude === undefined) {
    throw new Error("latitude and longitude are required for EPB packet");
  }

  const lat = toNmeaCoordinate(latitude, true);
  const lng = toNmeaCoordinate(longitude, false);
  return `$EPB,${imei},${state},${lat.value},${lat.direction},${lng.value},${lng.direction},${Number(speed).toFixed(1)},${Number(heading).toFixed(1)}\n`;
}

function buildOtaPacket({
  imei,
  status = "SUCCESS",
  fromVersion = "2.5AIS",
  toVersion = "2.6AIS",
  details = "OTA completed",
}) {
  validateImei(imei);
  return `$OTA,${imei},${status},${fromVersion},${toVersion},${details}\n`;
}

function buildActivationPacket({
  imei,
  status = "ON",
  details = "Activation acknowledged",
}) {
  validateImei(imei);
  return `$ACT,${imei},${status},${details}\n`;
}

module.exports = {
  calculateChecksum,
  buildGpsDateTimeParts,
  buildLoginPacket,
  buildHealthPacket,
  buildNrmPacket,
  buildAlertPacket,
  buildEmergencyPacket,
  buildOtaPacket,
  buildActivationPacket,
};
