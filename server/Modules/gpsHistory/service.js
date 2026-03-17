const mongoose = require("mongoose");
const paginate = require("../../helpers/limitoffset");
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

  // If it's strictly YYYY-MM-DD, apply start/end of day
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(
      `${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}Z`,
    );
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;

  // If the input string contains a 'T' or ' ' (likely has time), preserve it
  // otherwise default to start/end of day
  const hasTime = value.includes("T") || value.includes(":") || value.includes(" ");

  if (!hasTime) {
    if (endOfDay) {
      parsed.setUTCHours(23, 59, 59, 999);
    } else {
      parsed.setUTCHours(0, 0, 0, 0);
    }
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
  const filter = { ...buildOrgScopeFilter(orgScope) };
  if (vehicleId && vehicleId !== "all") {
    filter.vehicleId = new mongoose.Types.ObjectId(vehicleId);
  }
  return filter;
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
      "vehicleId imei latitude longitude speed heading gpsTimestamp ignitionStatus odometer address poi",
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
      ignitionStatus: Boolean(point.ignitionStatus),
      odometer: point.odometer ?? null,
      address: point.address || `${point.latitude}, ${point.longitude}`,
      poi: point.poi || "",
    })),
  };
}

async function getTravelSummary(vehicleId, orgScope, query = {}) {
  const { points, dateRange } = await fetchHistoryPoints(vehicleId, orgScope, query);

  // Group points by vehicleId if "all" is selected
  const pointsByVehicle = {};
  if (vehicleId === "all") {
    points.forEach(p => {
      const vId = p.vehicleId?.toString();
      if (vId) {
        if (!pointsByVehicle[vId]) pointsByVehicle[vId] = [];
        pointsByVehicle[vId].push(p);
      }
    });
  } else if (vehicleId && vehicleId !== "undefined") {
    pointsByVehicle[vehicleId] = points;
  }

  const vehicleIds = Object.keys(pointsByVehicle).filter(id => id && id !== "undefined" && mongoose.isValidObjectId(id));
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } }).populate("organizationId").lean();
  const drivers = await Driver.find({ _id: { $in: vehicles.map(v => v.driverId).filter(id => id) } }).lean();

  const results = [];

  for (const vId of vehicleIds) {
    const vPoints = pointsByVehicle[vId];
    if (!vPoints || vPoints.length === 0) continue;

    const vehicle = vehicles.find(v => v._id.toString() === vId);
    const branchName = vehicle?.organizationId?.name || "Unknown Branch";
    const driver = drivers.find(d => d._id?.toString() === vehicle?.driverId?.toString());
    const driverName = driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "Unnamed" : "No Driver Found";

    // Split points by day
    const pointsByDay = {};
    vPoints.forEach(p => {
      const d = new Date(p.gpsTimestamp).toISOString().split("T")[0];
      if (!pointsByDay[d]) pointsByDay[d] = [];
      pointsByDay[d].push(p);
    });

    const dailySummaries = [];
    Object.keys(pointsByDay).sort().forEach(date => {
      const dayPoints = pointsByDay[date];
      const { trips, tripSummary } = buildTrips(dayPoints);

      const maxStop = Math.max(0, ...trips.map(t => t.stopTime || 0), ...trips.map(t => t.inactiveTime || 0));
      const idleCount = trips.reduce((acc, t) => acc + (t.idleTime > 0 ? 1 : 0), 0);
      const overSpeedCountDaily = trips.filter(t => t.maxSpeed > 60).length;

      dailySummaries.push({
        date: date.split("-").reverse().join("-"),
        day: new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date(date)),
        distance: tripSummary.totalTripDistance,
        runningTime: tripSummary.totalRunning,
        idleTime: tripSummary.totalIdle,
        stopTime: tripSummary.totalStop,
        inactiveTime: tripSummary.totalInactive,
        duration: tripSummary.totalDuration,
        maxStoppage: maxStop,
        idleCount: idleCount,
        overSpeedCount: overSpeedCountDaily,
        avgSpeed: tripSummary.avgSpeed,
        maxSpeed: tripSummary.maxSpeed,
        firstIgnitionOn: tripSummary.firstIgnitionOn,
        lastIgnitionOff: tripSummary.lastIgnitionOff,
        startLocation: trips[0]?.startLocation,
        endLocation: trips[trips.length - 1]?.endLocation,
        startOdometer: trips[0]?.startOdometer,
        endOdometer: trips[trips.length - 1]?.endOdometer,
        alerts: trips.reduce((sum, t) => sum + (t.alerts || 0), 0),
      });
    });

    // Aggregate from already-computed dailySummaries — no second buildTrips pass needed
    const allTripsFlat = dailySummaries;
    const totalSummary = {
      totalTripDistance: Number(allTripsFlat.reduce((s, d) => s + Number(d.distance || 0), 0).toFixed(2)),
      totalRunning: allTripsFlat.reduce((s, d) => s + Number(d.runningTime || 0), 0),
      totalIdle: allTripsFlat.reduce((s, d) => s + Number(d.idleTime || 0), 0),
      totalStop: allTripsFlat.reduce((s, d) => s + Number(d.stopTime || 0), 0),
      totalInactive: allTripsFlat.reduce((s, d) => s + Number(d.inactiveTime || 0), 0),
      totalDuration: allTripsFlat.reduce((s, d) => s + Number(d.duration || 0), 0),
      avgSpeed: 0,
      maxSpeed: Math.max(0, ...allTripsFlat.map(d => Number(d.maxSpeed || 0))),
    };
    const runningHours = totalSummary.totalRunning / 3600;
    totalSummary.avgSpeed = runningHours > 0
      ? Number((totalSummary.totalTripDistance / runningHours).toFixed(2))
      : 0;
    const maxStoppageGlobal = Math.max(0, ...allTripsFlat.map(d => Number(d.maxStoppage || 0)));
    const idleCountGlobal = allTripsFlat.reduce((s, d) => s + Number(d.idleCount || 0), 0);
    const overSpeedCountGlobal = allTripsFlat.reduce((s, d) => s + Number(d.overSpeedCount || 0), 0);
    // Derive first/last ignition from daily summaries
    const firstIgnitionDay = allTripsFlat.find(d => d.firstIgnitionOn);
    const lastIgnitionDay = [...allTripsFlat].reverse().find(d => d.lastIgnitionOff);
    const firstIgnitionOnGlobal = firstIgnitionDay?.firstIgnitionOn || null;
    const lastIgnitionOffGlobal = lastIgnitionDay?.lastIgnitionOff || null;

    results.push({
      vehicleId: vId,
      vehicleNumber: vehicle?.vehicleNumber || "N/A",
      imei: vehicle?.deviceImei || vPoints[0]?.imei || "N/A",
      brand: vehicle?.make || "-",
      make: vehicle?.make || "-",
      model: vehicle?.model || "-",
      branchName,
      driverName,
      distance: totalSummary.totalTripDistance,
      runningTime: totalSummary.totalRunning,
      idleTime: totalSummary.totalIdle,
      stopTime: totalSummary.totalStop,
      inactiveTime: totalSummary.totalInactive,
      duration: totalSummary.totalDuration,
      maxStoppage: maxStoppageGlobal,
      idleCount: idleCountGlobal,
      overSpeedCount: overSpeedCountGlobal,
      avgSpeed: totalSummary.avgSpeed,
      maxSpeed: totalSummary.maxSpeed,
      startLocation: dailySummaries[0]?.startLocation,
      endLocation: dailySummaries[dailySummaries.length - 1]?.endLocation,
      startOdometer: dailySummaries[0]?.startOdometer || 0,
      endOdometer: dailySummaries[dailySummaries.length - 1]?.endOdometer || 0,
      alerts: allTripsFlat.reduce((sum, d) => sum + Number(d.alerts || 0), 0),
      dailyBreakdown: dailySummaries
    });
  }

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    trips: results,
  };
}

async function getTripSummary(vehicleId, orgScope, query = {}) {
  const { points, dateRange } = await fetchHistoryPoints(vehicleId, orgScope, query);

  // Group points by vehicleId if "all" is selected
  const pointsByVehicle = {};
  if (vehicleId === "all") {
    points.forEach(p => {
      const vId = p.vehicleId?.toString();
      if (vId) {
        if (!pointsByVehicle[vId]) pointsByVehicle[vId] = [];
        pointsByVehicle[vId].push(p);
      }
    });
  } else if (vehicleId && vehicleId !== "undefined") {
    pointsByVehicle[vehicleId] = points;
  }

  const vehicleIds = Object.keys(pointsByVehicle).filter(id => id && id !== "undefined" && mongoose.isValidObjectId(id));
  const vehiclesList = await Vehicle.find({ _id: { $in: vehicleIds } }).populate("organizationId").lean();
  const driversList = await Driver.find({ _id: { $in: vehiclesList.map(v => v.driverId).filter(id => id) } }).lean();

  const results = [];

  for (const vId of vehicleIds) {
    const vPoints = pointsByVehicle[vId];
    if (!vPoints || vPoints.length === 0) continue;

    const { trips, tripSummary } = buildTrips(vPoints);
    const vehicle = vehiclesList.find(v => v._id.toString() === vId);
    const branchName = vehicle?.organizationId?.name || "Unknown Branch";
    const driver = driversList.find(d => d._id?.toString() === vehicle?.driverId?.toString());
    const driverName = driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "Unnamed" : "No Driver Found";

    const overSpeedThreshold = 60; // Default or from vehicle
    const overSpeedCount = trips.filter(t => t.maxSpeed > overSpeedThreshold).length;

    results.push({
      vehicleId: vId,
      vehicleNumber: vehicle?.vehicleNumber || "N/A",
      imei: vehicle?.deviceImei || vPoints[0]?.imei || "N/A",
      brand: vehicle?.make || "-",
      make: vehicle?.make || "-",
      model: vehicle?.model || "-",
      branchName,
      driverName,
      distance: tripSummary.totalTripDistance,
      runningTime: tripSummary.totalRunning,
      idleTime: tripSummary.totalIdle,
      stopTime: tripSummary.totalStop,
      inactiveTime: tripSummary.totalInactive,
      duration: tripSummary.totalDuration,
      firstIgnitionOn: tripSummary.firstIgnitionOn,
      lastIgnitionOff: tripSummary.lastIgnitionOff,
      avgSpeed: tripSummary.avgSpeed,
      maxSpeed: tripSummary.maxSpeed,
      immobilize: vehicle?.isImmobilized ? "Y" : "N",
      overSpeedCount: overSpeedCount,
      alerts: trips.reduce((sum, t) => sum + (t.alerts || 0), 0),
      tripCount: trips.length,
      individualTrips: trips.map(t => ({
        ...t,
        startCoordinate: t.startLocation ? `(${t.startLocation.latitude?.toFixed(6)}, ${t.startLocation.longitude?.toFixed(6)})` : "-",
        endCoordinate: t.endLocation ? `(${t.endLocation.latitude?.toFixed(6)}, ${t.endLocation.longitude?.toFixed(6)})` : "-",
        driverName,
        overSpeed: t.maxSpeed > overSpeedThreshold ? "Y" : "N",
        immobilize: vehicle?.isImmobilized ? "Y" : "N",
      }))
    });
  }

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    trips: results,
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
  // Apply optional alert type filter from query
  if (query.alertType && query.alertType !== "all") {
    alertFilter.alertName = query.alertType;
  }

  const paginatedResult = await paginate(
    Alert,
    alertFilter,
    query.page,
    query.limit || 50,
    [
      { path: "organizationId", select: "name" },
      { path: "vehicleId", select: "vehicleNumber driverId" },
    ],
    ["alertName"],
    query.search || "",
    { gpsTimestamp: -1 },
  );

  const alertDocs = paginatedResult.data;

  const emergencyDocs = await EmergencyEvent.find(alertFilter)
    .select("_id eventType gpsTimestamp")
    .lean();

  // Fetch drivers for the vehicles found in alertDocs (current page only)
  const vehicleDriverIds = alertDocs
    .map((a) => a.vehicleId?.driverId)
    .filter((id) => id && mongoose.isValidObjectId(id));

  const drivers = await Driver.find({ _id: { $in: vehicleDriverIds } }).select("firstName lastName").lean();

  const enrichedAlerts = alertDocs.map(alert => {
    const driver = drivers.find(d => d._id.toString() === alert.vehicleId?.driverId?.toString());

    // Aesthetic mapping to match user screenshot style
    let type = alert.alertName || "Alert";
    let info = alert.message || alert.alertName || "-";

    if (type.includes("Ignition")) {
      type = "Ignition/ACC";
      info = alert.alertName; // e.g. "Ignition On" or "Ignition Off"
    }

    return {
      id: alert._id,
      gpsTimestamp: alert.gpsTimestamp,
      branch: alert.organizationId?.name || "N/A",
      vehicle: alert.vehicleId?.vehicleNumber || "N/A",
      driver: driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() : "N/A",
      type,
      information: info,
      location: alert.address || (alert.latitude && alert.longitude ? `${alert.latitude}, ${alert.longitude}` : "-"),
      duration: "00:00:00",
    };
  });

  return {
    vehicleId,
    from: dateRange.from,
    to: dateRange.to,
    alerts: enrichedAlerts,
    pagination: paginatedResult.pagination,
    ...summarizeAlerts(alertDocs, emergencyDocs, []), // Keep summary counts
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
