const redisClient = require("../config/redis");
const { calculateDistance } = require("./utils");
const POI = require("../Modules/poi/model");
const GpsLiveData = require("../Modules/gpsLiveData/model");
const GpsHistory = require("../Modules/gpsHistory/model");
const Vehicle = require("../Modules/vehicle/model");
const { getIo } = require("../socket");

const ADDRESS_CACHE_TTL_SECONDS = Number(
  process.env.LOCATION_ADDRESS_CACHE_TTL_SECONDS || 60 * 60 * 24 * 7,
);
const POI_CACHE_TTL_SECONDS = Number(
  process.env.LOCATION_POI_CACHE_TTL_SECONDS || 60 * 15,
);
const ADDRESS_CACHE_DECIMALS = Math.min(
  6,
  Math.max(
    3,
    Number(
      process.env.LOCATION_ADDRESS_CACHE_DECIMALS ||
        process.env.LOCATION_CACHE_DECIMALS ||
        4,
    ),
  ),
);
const POI_CACHE_DECIMALS = Math.min(
  6,
  Math.max(
    3,
    Number(
      process.env.LOCATION_POI_CACHE_DECIMALS ||
        process.env.LOCATION_CACHE_DECIMALS ||
        5,
    ),
  ),
);
const DEFAULT_POI_SEARCH_RADIUS_METERS = Number(
  process.env.LOCATION_POI_MAX_DISTANCE_METERS || 1000,
);
const GEOCODER_TIMEOUT_MS = Number(
  process.env.LOCATION_GEOCODER_TIMEOUT_MS || 4000,
);
const MAX_CONCURRENT_ENRICHMENT = Number(
  process.env.MAX_CONCURRENT_LOCATION_ENRICHMENT || 10,
);
const VEHICLE_LOCATION_CHANGE_MIN_METERS = Number(
  process.env.VEHICLE_LOCATION_CHANGE_MIN_METERS || 50,
);
const VEHICLE_LOCATION_MIN_UPDATE_INTERVAL_SECONDS = Number(
  process.env.VEHICLE_LOCATION_MIN_UPDATE_INTERVAL_SECONDS || 30,
);

const GOOGLE_GEOCODING_API_KEY =
  process.env.GOOGLE_GEOCODING_API_KEY ||
  process.env.GOOGLE_MAPS_API_KEY ||
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
  "";
const REVERSE_GEOCODE_PROVIDER = (
  process.env.REVERSE_GEOCODE_PROVIDER ||
  (GOOGLE_GEOCODING_API_KEY ? "google" : "nominatim")
).toLowerCase();

const pendingAddressResolutions = new Map();
const pendingPoiResolutions = new Map();
const enrichmentQueue = [];
let activeEnrichmentTasks = 0;

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function roundCoordinate(value, decimals) {
  return Number(value).toFixed(decimals);
}

function buildCellKey(latitude, longitude, decimals) {
  return `${roundCoordinate(latitude, decimals)},${roundCoordinate(longitude, decimals)}`;
}

function buildAddressCacheKey(latitude, longitude) {
  return `location:address:${buildCellKey(latitude, longitude, ADDRESS_CACHE_DECIMALS)}`;
}

function buildPoiCacheKey(organizationId, latitude, longitude) {
  return `location:poi:${organizationId || "global"}:${buildCellKey(latitude, longitude, POI_CACHE_DECIMALS)}`;
}

function normalizeAddress(rawAddress) {
  if (!rawAddress || typeof rawAddress !== "string") return "";
  return rawAddress
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

async function readJsonCache(key) {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error("Location cache read error:", error?.message || error);
    return null;
  }
}

async function writeJsonCache(key, ttlSeconds, value) {
  try {
    await redisClient.setex(key, ttlSeconds, value);
  } catch (error) {
    console.error("Location cache write error:", error?.message || error);
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = GEOCODER_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Geocoder request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function reverseGeocodeWithGoogle(latitude, longitude) {
  if (!GOOGLE_GEOCODING_API_KEY) return null;

  const params = new URLSearchParams({
    latlng: `${latitude},${longitude}`,
    key: GOOGLE_GEOCODING_API_KEY,
  });

  const response = await fetchWithTimeout(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error(`Google geocoding failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const address = normalizeAddress(data?.results?.[0]?.formatted_address);
  return address || null;
}

async function reverseGeocodeWithNominatim(latitude, longitude) {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    zoom: "18",
    addressdetails: "1",
  });

  const response = await fetchWithTimeout(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        "User-Agent":
          process.env.REVERSE_GEOCODE_USER_AGENT ||
          "gps-tracker-location-enrichment/1.0",
        "Accept-Language": process.env.REVERSE_GEOCODE_LANGUAGE || "en",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`Nominatim reverse geocoding failed with HTTP ${response.status}`);
  }

  const data = await response.json();
  const address = normalizeAddress(data?.display_name);
  return address || null;
}

async function reverseGeocode(latitude, longitude) {
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return null;

  try {
    if (REVERSE_GEOCODE_PROVIDER === "google" && GOOGLE_GEOCODING_API_KEY) {
      return await reverseGeocodeWithGoogle(latitude, longitude);
    }
    return await reverseGeocodeWithNominatim(latitude, longitude);
  } catch (error) {
    console.error("Reverse geocoding error:", error?.message || error);
    return null;
  }
}

async function resolveAddressWithCache(latitude, longitude) {
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return null;

  const cacheKey = buildAddressCacheKey(latitude, longitude);
  const cached = await readJsonCache(cacheKey);
  if (cached) return cached.address || null;

  if (pendingAddressResolutions.has(cacheKey)) {
    return pendingAddressResolutions.get(cacheKey);
  }

  const pendingPromise = (async () => {
    const address = await reverseGeocode(latitude, longitude);
    await writeJsonCache(cacheKey, ADDRESS_CACHE_TTL_SECONDS, { address: address || "" });
    return address;
  })()
    .catch((error) => {
      console.error("Address enrichment pending error:", error?.message || error);
      return null;
    })
    .finally(() => {
      pendingAddressResolutions.delete(cacheKey);
    });

  pendingAddressResolutions.set(cacheKey, pendingPromise);
  return pendingPromise;
}

async function shouldUpdateVehicleLocation(vehicleId, latitude, longitude, packetTimestamp, syncVehicleLocation) {
  if (!vehicleId) return false;

  const vehicle = await Vehicle.findById(vehicleId)
    .select("lastUpdated currentLocation.latitude currentLocation.longitude")
    .lean();

  if (!vehicle) return false;

  if (syncVehicleLocation) return true;

  const lastUpdatedMs = vehicle.lastUpdated
    ? new Date(vehicle.lastUpdated).getTime()
    : null;
  const packetTimestampMs = packetTimestamp
    ? new Date(packetTimestamp).getTime()
    : null;

  if (!lastUpdatedMs || !packetTimestampMs || Number.isNaN(lastUpdatedMs) || Number.isNaN(packetTimestampMs)) {
    return true;
  }

  if (
    isFiniteNumber(vehicle?.currentLocation?.latitude) &&
    isFiniteNumber(vehicle?.currentLocation?.longitude)
  ) {
    const movementMeters =
      calculateDistance(
        latitude,
        longitude,
        vehicle.currentLocation.latitude,
        vehicle.currentLocation.longitude,
      ) * 1000;
    if (movementMeters > VEHICLE_LOCATION_CHANGE_MIN_METERS) {
      return true;
    }
  }

  return (
    packetTimestampMs - lastUpdatedMs >=
    VEHICLE_LOCATION_MIN_UPDATE_INTERVAL_SECONDS * 1000
  );
}

function normalizePoiCandidate(poi, latitude, longitude) {
  if (!Array.isArray(poi?.locationCoordinates) || poi.locationCoordinates.length < 2) {
    return null;
  }

  const poiLongitude = Number(poi.locationCoordinates[0]);
  const poiLatitude = Number(poi.locationCoordinates[1]);
  if (!isFiniteNumber(poiLatitude) || !isFiniteNumber(poiLongitude)) {
    return null;
  }

  const distanceMeters =
    calculateDistance(latitude, longitude, poiLatitude, poiLongitude) * 1000;
  const radiusMeters = Number(poi.radius || 0) || 0;
  const effectiveRadius = radiusMeters > 0 ? radiusMeters : DEFAULT_POI_SEARCH_RADIUS_METERS;

  if (distanceMeters > effectiveRadius) {
    return null;
  }

  return {
    poiId: String(poi._id),
    poiName: typeof poi.name === "string" ? poi.name.trim() : "",
    poiType: typeof poi.type === "string" ? poi.type.trim() : "",
    distanceMeters: Math.round(distanceMeters),
    radiusMeters: effectiveRadius,
  };
}

async function queryNearestPoi(organizationId, latitude, longitude) {
  if (!organizationId) return null;

  const baseFilter = {
    organizationId,
    locationCoordinates: { $exists: true, $type: "array" },
  };

  try {
    const geoCandidates = await POI.find({
      ...baseFilter,
      locationCoordinates: {
        $nearSphere: {
          $geometry: {
            type: "Point",
            coordinates: [longitude, latitude],
          },
          $maxDistance: DEFAULT_POI_SEARCH_RADIUS_METERS,
        },
      },
    })
      .select("name type radius locationCoordinates")
      .limit(10)
      .lean();

    const normalized = geoCandidates
      .map((poi) => normalizePoiCandidate(poi, latitude, longitude))
      .filter(Boolean);

    return normalized[0] || null;
  } catch (error) {
    // Fallback while existing POI data/index catches up.
    const candidates = await POI.find(baseFilter)
      .select("name type radius locationCoordinates")
      .limit(200)
      .lean();

    return (
      candidates
        .map((poi) => normalizePoiCandidate(poi, latitude, longitude))
        .filter(Boolean)
        .sort((left, right) => left.distanceMeters - right.distanceMeters)[0] ||
      null
    );
  }
}

async function resolvePoiWithCache(organizationId, latitude, longitude) {
  if (!organizationId || !isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
    return null;
  }

  const cacheKey = buildPoiCacheKey(organizationId, latitude, longitude);
  const cached = await readJsonCache(cacheKey);
  if (cached) return cached;

  if (pendingPoiResolutions.has(cacheKey)) {
    return pendingPoiResolutions.get(cacheKey);
  }

  const pendingPromise = (async () => {
    const poi = await queryNearestPoi(organizationId, latitude, longitude);
    await writeJsonCache(cacheKey, POI_CACHE_TTL_SECONDS, poi || { poiId: null, poiName: "" });
    return poi;
  })()
    .catch((error) => {
      console.error("POI enrichment pending error:", error?.message || error);
      return null;
    })
    .finally(() => {
      pendingPoiResolutions.delete(cacheKey);
    });

  pendingPoiResolutions.set(cacheKey, pendingPromise);
  return pendingPromise;
}

async function persistLocationEnrichment({
  organizationId,
  vehicleId,
  gpsDeviceId,
  imei,
  latitude,
  longitude,
  packetTimestamp,
  historyId,
  syncVehicleLocation,
  address,
  poi,
}) {
  const updates = [];

  const liveUpdate = {};
  if (address) {
    liveUpdate.currentLocation = address;
  }
  if (poi !== undefined) {
    liveUpdate.poi = poi?.poiName || "";
    liveUpdate.poiId = poi?.poiId || null;
  }

  if (gpsDeviceId && Object.keys(liveUpdate).length > 0) {
    updates.push(
      GpsLiveData.updateOne(
        { gpsDeviceId, latitude, longitude },
        { $set: liveUpdate },
      ),
    );
  }

  const historyUpdate = {};
  if (address) {
    historyUpdate.address = address;
  }
  if (poi !== undefined) {
    historyUpdate.poi = poi?.poiName || "";
    historyUpdate.poiId = poi?.poiId || null;
  }

  if (historyId && Object.keys(historyUpdate).length > 0) {
    updates.push(GpsHistory.updateOne({ _id: historyId }, { $set: historyUpdate }));
  }

  if (
    vehicleId &&
    (await shouldUpdateVehicleLocation(
      vehicleId,
      latitude,
      longitude,
      packetTimestamp,
      syncVehicleLocation,
    ))
  ) {
    const vehicleUpdate = {
      "currentLocation.latitude": latitude,
      "currentLocation.longitude": longitude,
      "currentLocation.coordinates": [longitude, latitude],
      lastUpdated: packetTimestamp,
    };

    if (address) {
      vehicleUpdate["currentLocation.address"] = address;
    }
    if (poi !== undefined) {
      vehicleUpdate.poi = poi?.poiName || "";
      vehicleUpdate.poiId = poi?.poiId || null;
    }

    updates.push(
      Vehicle.updateOne(
        {
          _id: vehicleId,
          $or: [
            { lastUpdated: { $exists: false } },
            { lastUpdated: null },
            { lastUpdated: { $lte: packetTimestamp } },
          ],
        },
        { $set: vehicleUpdate },
      ),
    );
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }

  try {
    const io = getIo();
    if (io) {
      const socketPayload = {
        imei,
        organizationId,
        vehicleId,
        gpsDeviceId,
        latitude,
        longitude,
        gpsTimestamp: packetTimestamp,
        currentLocation: address || undefined,
        poi: poi?.poiName || "",
        updatedAt: new Date(),
      };

      io.to(`device_${imei}`).emit("gps_update", socketPayload);
      io.to(`org_${organizationId}`).emit("gps_update", socketPayload);
    }
  } catch {
    // Socket server may not be available during tests/startup.
  }
}

async function enrichLocationContext(context) {
  const latitude = Number(context.latitude);
  const longitude = Number(context.longitude);
  if (!isFiniteNumber(latitude) || !isFiniteNumber(longitude)) return null;

  const [address, poi] = await Promise.all([
    resolveAddressWithCache(latitude, longitude),
    resolvePoiWithCache(context.organizationId, latitude, longitude),
  ]);

  await persistLocationEnrichment({
    ...context,
    latitude,
    longitude,
    address,
    poi,
  });

  return { address, poi };
}

function scheduleLocationEnrichment(context) {
  if (!context) return;

  enrichmentQueue.push(context);
  drainEnrichmentQueue();
}

function drainEnrichmentQueue() {
  while (
    activeEnrichmentTasks < MAX_CONCURRENT_ENRICHMENT &&
    enrichmentQueue.length > 0
  ) {
    const context = enrichmentQueue.shift();
    activeEnrichmentTasks += 1;

    setImmediate(() => {
      enrichLocationContext(context)
        .catch((error) => {
          console.error(
            "Location enrichment background error:",
            error?.message || error,
          );
        })
        .finally(() => {
          activeEnrichmentTasks = Math.max(0, activeEnrichmentTasks - 1);
          drainEnrichmentQueue();
        });
    });
  }
}

module.exports = {
  scheduleLocationEnrichment,
  enrichLocationContext,
};
