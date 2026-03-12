const mongoose = require("mongoose");
const GpsHistory = require("./model");
const GpsLiveData = require("../gpsLiveData/model");
const VehicleDailyStats = require("../vehicleDailyStats/model");
const Alert = require("../alerts/model");
const EmergencyEvent = require("../emergencyEvents/model");
const Vehicle = require("../vehicle/model");
const Driver = require("../drivers/model");
const {
  calculateStatistics,
  buildTrips,
  buildDaywiseDistance,
  summarizeAlerts,
} = require("./analytics");

function buildOrgScopeFilter(orgScope) {
  if (!orgScope || orgScope === "ALL") return {};
  return { organizationId: { $in: orgScope } };
}

function parseBoundaryDate(value, endOfDay = false) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(
      `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  if (endOfDay) {
    parsed.setUTCHours(23, 59, 59, 999);
  } else {
    parsed.setUTCHours(0, 0, 0, 0);
  }

  return parsed;
}

function buildDateRange(query = {}) {
  const from = parseBoundaryDate(query.from, false);
  const to = parseBoundaryDate(query.to, true);

  if (from && to && from > to) {
    throw new Error("Invalid date range: 'from' must be before 'to'");
  }

  return { from, to };
}

function applyTimestampFilter(filter, field, dateRange) {
  if (!dateRange.from && !dateRange.to) return filter;

  filter[field] = {};
  if (dateRange.from) filter[field].$gte = dateRange.from;
  if (dateRange.to) filter[field].$lte = dateRange.to;
  return filter;
}

function buildScopedVehicleFilter(vehicleId, orgScope) {
  return {
    vehicleId: new mongoose.Types.ObjectId(vehicleId),
    ...buildOrgScopeFilter(orgScope),
  };
}

async function fetchHistoryPoints(vehicleId, orgScope, query = {}) {
  const dateRange = buildDateRange(query);
  const filter = applyTimestampFilter(
    buildScopedVehicleFilter(vehicleId, orgScope),
    "gpsTimestamp",
    dateRange,
  );

  const points = await GpsHistory.find(filter)
    .sort({ gpsTimestamp: 1 })
    .select(
      "latitude longitude speed heading gpsTimestamp ignitionStatus odometer address",
    )
    .lean();

  return { points, dateRange };
}

async function getStatistics(vehicleId, orgScope, query = {}) {
  const dateRange = buildDateRange(query);
  const filter = applyTimestampFilter(
    buildScopedVehicleFilter(vehicleId, orgScope),
    "date",
    dateRange,
  );

  const stats = await VehicleDailyStats.find(filter)
    .select("totalDistance avgSpeed maxSpeed runningTime idleTime ignitionOnCount")
    .lean();

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    ...calculateStatistics(stats),
  };
}

async function getVehicleStatus(vehicleId, orgScope) {
  const liveData = await GpsLiveData.findOne(buildScopedVehicleFilter(vehicleId, orgScope))
    .sort({ gpsTimestamp: -1 })
    .lean();

  if (!liveData) {
    return {
      ignitionStatus: false,
      currentSpeed: 0,
      gpsStatus: "offline",
      batteryLevel: null,
      satellites: null,
      powerStatus: null,
      fuel: null,
      temperature: null,
      gpsTimestamp: null,
    };
  }

  return {
    ignitionStatus: Boolean(liveData.ignitionStatus),
    currentSpeed: Number(liveData.currentSpeed || 0),
    gpsStatus: liveData.gpsFixed === false ? "offline" : "live",
    batteryLevel: liveData.batteryLevel ?? null,
    satellites: liveData.numberOfSatellites ?? null,
    powerStatus: liveData.mainPowerStatus ?? null,
    fuel: liveData.fuelPercentage ?? null,
    temperature: liveData.temperature ?? null,
    gpsTimestamp: liveData.gpsTimestamp ?? null,
  };
}

async function getPlayback(vehicleId, orgScope, query = {}) {
  const { points, dateRange } = await fetchHistoryPoints(vehicleId, orgScope, query);

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    points: points.map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      speed: Number(point.speed || 0),
      heading: point.heading ?? null,
      gpsTimestamp: point.gpsTimestamp,
    })),
  };
}

async function getTravelSummary(vehicleId, orgScope, query = {}) {
  const { points, dateRange } = await fetchHistoryPoints(vehicleId, orgScope, query);
  const { trips, tripSummary } = buildTrips(points);

  const vehicle = await Vehicle.findById(vehicleId).populate("organizationId").lean();
  let driverName = "No Driver Found";
  if (vehicle && vehicle.driverId) {
    const driver = await Driver.findById(vehicle.driverId).lean();
    if (driver) {
      driverName = `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "Unnamed Driver";
    }
  }

  const branchName = vehicle?.organizationId?.name || "Unknown Branch";

  const getDayName = (date) => {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(date));
  };

  if (!trips.length) {
    return {
      vehicleId,
      from: dateRange.from,
      to: dateRange.to,
      trips: [],
    };
  }

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    trips: [
      {
        date: dateRange.from ? new Date(dateRange.from).toLocaleDateString("en-GB").replace(/\//g, "-") : "-",
        day: dateRange.from ? getDayName(dateRange.from) : "-",
        branchName: branchName,
        driverName: driverName,
        distance: tripSummary.totalTripDistance,
        runningTime: tripSummary.totalRunning,
        idleTime: tripSummary.totalIdle,
        stopTime: tripSummary.totalStop,
        inactiveTime: tripSummary.totalInactive,
        duration: tripSummary.totalDuration,
        startLocation: trips[0]?.startLocation,
        endLocation: trips[trips.length - 1]?.endLocation,
        startOdometer: trips[0]?.startOdometer,
        endOdometer: trips[trips.length - 1]?.endOdometer,
        alerts: trips.reduce((sum, trip) => sum + (trip.alerts || 0), 0),
        maxSpeed: Math.max(...trips.map((t) => t.maxSpeed || 0)),
        avgSpeed: tripSummary.totalRunning > 0 ? Number((tripSummary.totalTripDistance / (tripSummary.totalRunning / 3600)).toFixed(2)) : 0,
      },
    ],
  };
}

async function getTripSummary(vehicleId, orgScope, query = {}) {
  const { points, dateRange } = await fetchHistoryPoints(vehicleId, orgScope, query);
  const { trips, tripSummary } = buildTrips(points);

  const vehicle = await Vehicle.findById(vehicleId).populate("organizationId").lean();
  let driverName = "No Driver Found";
  if (vehicle && vehicle.driverId) {
    const driver = await Driver.findById(vehicle.driverId).lean();
    if (driver) {
      driverName = `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "Unnamed Driver";
    }
  }

  const branchName = vehicle?.organizationId?.name || "Unknown Branch";
  const getDayName = (date) => {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(date));
  };

  const enrichedTrips = trips.map(trip => ({
    ...trip,
    date: trip.startTime ? new Date(trip.startTime).toLocaleDateString("en-GB").replace(/\//g, "-") : "-",
    day: trip.startTime ? getDayName(trip.startTime) : "-",
    branchName,
    driverName,
    // Use metrics from finalizeTrip
    runningTime: trip.runningTime,
    idleTime: trip.idleTime,
    stopTime: trip.stopTime,
    inactiveTime: trip.inactiveTime,
    avgSpeed: trip.avgSpeed,
    maxSpeed: trip.maxSpeed,
    // For playback
    playbackParams: {
      from: trip.startTime,
      to: trip.endTime,
      vehicleId
    }
  }));

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    trips: enrichedTrips,
    tripSummary,
  };
}

async function getDaywiseDistance(vehicleId, orgScope, query = {}) {
  const dateRange = buildDateRange(query);
  const match = applyTimestampFilter(
    buildScopedVehicleFilter(vehicleId, orgScope),
    "gpsTimestamp",
    dateRange,
  );

  const groupedDays = await GpsHistory.aggregate([
    { $match: match },
    { $sort: { gpsTimestamp: 1 } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$gpsTimestamp",
            timezone: "UTC",
          },
        },
        points: {
          $push: {
            latitude: "$latitude",
            longitude: "$longitude",
            odometer: "$odometer",
          },
        },
      },
    },
    { $project: { _id: 0, date: "$_id", points: 1 } },
    { $sort: { date: 1 } },
  ]);

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    days: buildDaywiseDistance(groupedDays),
  };
}

async function getAlertSummary(vehicleId, orgScope, query = {}) {
  const dateRange = buildDateRange(query);
  const alertFilter = applyTimestampFilter(
    buildScopedVehicleFilter(vehicleId, orgScope),
    "gpsTimestamp",
    dateRange,
  );

  const [latestAlerts, alertDocs, emergencyDocs] = await Promise.all([
    Alert.find(alertFilter)
      .sort({ gpsTimestamp: -1 })
      .limit(10)
      .select("_id alertId alertName severity gpsTimestamp")
      .lean(),
    Alert.find(alertFilter)
      .select("alertId alertName severity gpsTimestamp")
      .lean(),
    EmergencyEvent.find(alertFilter).select("_id eventType gpsTimestamp").lean(),
  ]);

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    ...summarizeAlerts(alertDocs, emergencyDocs, latestAlerts),
  };
}

module.exports = {
  buildOrgScopeFilter,
  buildDateRange,
  getStatistics,
  getVehicleStatus,
  getPlayback,
  getTravelSummary,
  getTripSummary,
  getDaywiseDistance,
  getAlertSummary,
};
