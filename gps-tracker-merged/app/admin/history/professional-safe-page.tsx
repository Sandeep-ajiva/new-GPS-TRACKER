"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Clock,
  Gauge,
  Loader2,
  MapPin,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  User,
  Phone,
  Mail,
  FileText,
  X,
  ZoomIn,
} from "lucide-react";
import { MapContainer, Marker, Polyline, Popup } from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { toast } from "sonner";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";
import { useGetVehicleDriverMappingsQuery } from "@/redux/api/vehicleDriverMappingApi";
import { Button } from "@/components/ui/button";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import MapTileLayer from "@/components/admin/Map/MapTileLayer";

type HistoryPoint = {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  ignition: boolean;
  address: string;
  alertType: string;
  heading: number;
};

type LatLng = { lat: number; lng: number };

type VehicleOption = {
  _id: string;
  vehicleNumber?: string;
  registrationNumber?: string;
  plateNumber?: string;
  name?: string;
  driverId?: string | {
    _id?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    licenseNumber?: string;
    address?: string;
  };
};

type RawHistoryPoint = {
  latitude?: number | string;
  longitude?: number | string;
  lat?: number | string;
  lng?: number | string;
  lon?: number | string;
  gpsTimestamp?: string;
  receivedAt?: string;
  timestamp?: string;
  speed?: number | string;
  ignitionStatus?: boolean;
  ignition?: boolean;
  address?: string;
  alertType?: string;
  alertIdentifier?: string;
  alertId?: number | string;
  packetType?: string;
  emergencyStatus?: boolean;
  tamperAlert?: string;
  heading?: number | string;
  course?: number | string;
};

type VehicleDriverMapping = {
  vehicleId?:
    | string
    | {
      _id?: string;
    };
  driverId?:
    | string
    | {
      _id?: string;
      firstName?: string;
      lastName?: string;
    };
};

const MAX_RENDER_POINTS = 1800;
const MAX_REASONABLE_SPEED_KMH = 180;
const MAX_SINGLE_JUMP_KM = 30;
const ALERT_SPEED_THRESHOLD_KMH = 80;
const INDIA_DEFAULT_CENTER: LatLngExpression = [20.5937, 78.9629];

const clampIndex = (index: number, length: number) => {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
};

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (a: LatLng, b: LatLng) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadius * c;
};

const normalizeCoordinatePair = (lat: number, lng: number): LatLng | null => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  // Fix lat/lng swapped payloads (common data issue in mixed integrations)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    const swapped = { lat: lng, lng: lat };
    if (Math.abs(swapped.lat) <= 90 && Math.abs(swapped.lng) <= 180) return swapped;
  }

  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
};

const getVehicleId = (value: VehicleDriverMapping["vehicleId"]) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  return typeof value._id === "string" ? value._id : "";
};

const formatDriverName = (driver: VehicleDriverMapping["driverId"] | VehicleOption["driverId"]) => {
  if (!driver) return "";
  if (typeof driver === "string") return "";
  const first = typeof driver.firstName === "string" ? driver.firstName.trim() : "";
  const last = typeof driver.lastName === "string" ? driver.lastName.trim() : "";
  return `${first} ${last}`.trim();
};

const inferAlertType = (item: RawHistoryPoint) => {
  if (typeof item.alertType === "string" && item.alertType.trim()) return item.alertType.trim();
  if (typeof item.alertIdentifier === "string" && item.alertIdentifier.trim()) return item.alertIdentifier.trim();

  if (typeof item.packetType === "string" && item.packetType.trim() && item.packetType !== "NR") {
    return item.packetType.trim();
  }

  if (item.alertId !== undefined && item.alertId !== null && String(item.alertId).trim()) {
    return String(item.alertId).trim();
  }

  if (item.emergencyStatus) return "emergency";
  if (item.tamperAlert) return "tamper";

  const speed = Number(item.speed ?? 0);
  if (Number.isFinite(speed) && speed > ALERT_SPEED_THRESHOLD_KMH) return "overspeed";

  return "";
};

const perpendicularDistance = (point: LatLng, lineStart: LatLng, lineEnd: LatLng) => {
  const x0 = point.lng;
  const y0 = point.lat;
  const x1 = lineStart.lng;
  const y1 = lineStart.lat;
  const x2 = lineEnd.lng;
  const y2 = lineEnd.lat;

  const numerator = Math.abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

  if (denominator === 0) return Math.hypot(x0 - x1, y0 - y1);
  return numerator / denominator;
};

const simplifyDouglasPeucker = (points: LatLng[], epsilon: number): LatLng[] => {
  if (points.length <= 2) return points;

  let maxDistance = 0;
  let index = 0;

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > epsilon) {
    const left = simplifyDouglasPeucker(points.slice(0, index + 1), epsilon);
    const right = simplifyDouglasPeucker(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  return [points[0], points[points.length - 1]];
};

const simplifyIfNeeded = (points: LatLng[]) => {
  if (points.length <= MAX_RENDER_POINTS) return points;
  const epsilon = 0.00008 + (points.length / 1000000) * 0.0002;
  return simplifyDouglasPeucker(points, epsilon);
};

export default function ProfessionalHistoryPage() {
  const [vehicleId, setVehicleId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(true);
  const [shouldFetch, setShouldFetch] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [followVehicle, setFollowVehicle] = useState(false);

  const [animatedPos, setAnimatedPos] = useState<LatLng | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

  const leafletMapRef = useRef<LeafletMap | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastIndexRef = useRef(0);

  const { data: vehiclesResponse, error: vehiclesError } = useGetVehiclesQuery(
    { page: 0, limit: 1000 },
    { refetchOnMountOrArgChange: true },
  );

  const { data: mappingResponse } = useGetVehicleDriverMappingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const {
    data: historyResponse,
    error: historyError,
    isLoading: isHistoryLoading,
    isFetching,
  } = useGetVehicleHistoryQuery(
    {
      vehicleId,
      from: showAllHistory ? undefined : dateFrom || undefined,
      to: showAllHistory ? undefined : dateTo || undefined,
      page: 0,
      limit: 20000,
    },
    { skip: !vehicleId || (!shouldFetch && !showAllHistory), refetchOnMountOrArgChange: true },
  );

  const vehicles = useMemo<VehicleOption[]>(() => {
    const raw = vehiclesResponse && "data" in vehiclesResponse ? vehiclesResponse.data : undefined;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((v) => {
        if (!v || typeof v !== "object") return null;
        const vehicle = v as any;
        const id = typeof vehicle._id === "string" ? vehicle._id : "";
        if (!id) return null;
        return {
          _id: id,
          vehicleNumber: typeof vehicle.vehicleNumber === "string" ? vehicle.vehicleNumber : undefined,
          registrationNumber: typeof vehicle.registrationNumber === "string" ? vehicle.registrationNumber : undefined,
          plateNumber: typeof vehicle.plateNumber === "string" ? vehicle.plateNumber : undefined,
          name: typeof vehicle.name === "string" ? vehicle.name : undefined,
          driverId:
            typeof vehicle.driverId === "string" || (vehicle.driverId && typeof vehicle.driverId === "object")
              ? vehicle.driverId
              : null,
        };
      })
      .filter((v): v is VehicleOption => v !== null);
  }, [vehiclesResponse]);

  const vehicleDriverMappings = useMemo<VehicleDriverMapping[]>(() => {
    const raw = mappingResponse && "data" in mappingResponse ? mappingResponse.data : undefined;
    if (!Array.isArray(raw)) return [];
    return raw as VehicleDriverMapping[];
  }, [mappingResponse]);

  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => vehicle._id === vehicleId) ?? null, [vehicles, vehicleId]);

  const driverName = useMemo(() => {
    const fromVehicle = formatDriverName(selectedVehicle?.driverId);
    if (fromVehicle) return fromVehicle;

    const mapping = vehicleDriverMappings.find((item) => getVehicleId(item.vehicleId) === vehicleId);
    const fromMapping = formatDriverName(mapping?.driverId);
    return fromMapping || "Unassigned";
  }, [selectedVehicle, vehicleDriverMappings, vehicleId]);

  const rawHistory = useMemo<RawHistoryPoint[]>(() => {
    const raw = historyResponse && "data" in historyResponse ? historyResponse.data : undefined;
    if (!Array.isArray(raw)) return [];
    return raw as RawHistoryPoint[];
  }, [historyResponse]);

  const points = useMemo<HistoryPoint[]>(() => {
    if (rawHistory.length === 0) return [];

    const normalized = rawHistory
      .map((item) => {
        const latRaw = item.latitude ?? item.lat;
        const lngRaw = item.longitude ?? item.lng ?? item.lon;
        const parsedLat = typeof latRaw === "string" ? Number.parseFloat(latRaw) : Number(latRaw);
        const parsedLng = typeof lngRaw === "string" ? Number.parseFloat(lngRaw) : Number(lngRaw);
        const timestamp = item.gpsTimestamp ?? item.receivedAt ?? item.timestamp;
        const normalizedCoords = normalizeCoordinatePair(parsedLat, parsedLng);

        if (!normalizedCoords || !timestamp) {
          return null;
        }

        return {
          lat: normalizedCoords.lat,
          lng: normalizedCoords.lng,
          timestamp: String(timestamp),
          speed: Number(item.speed ?? 0),
          ignition: Boolean(item.ignitionStatus ?? item.ignition),
          address: String(item.address ?? ""),
          alertType: inferAlertType(item),
          heading: Number(item.heading ?? item.course ?? 0),
        };
      })
      .filter((item: HistoryPoint | null): item is HistoryPoint => item !== null);

    if (normalized.length <= 1) {
      return normalized.map((point) => ({
        ...point,
        address: point.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
      }));
    }

    const sorted = normalized
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const cleaned: HistoryPoint[] = [];
    for (const point of sorted) {
      if (cleaned.length === 0) {
        cleaned.push(point);
        continue;
      }

      const previous = cleaned[cleaned.length - 1];
      const dtMs = new Date(point.timestamp).getTime() - new Date(previous.timestamp).getTime();

      // Keep out-of-order or same-time points out of route construction.
      if (!Number.isFinite(dtMs) || dtMs <= 0) continue;

      const distanceKm = getDistanceMeters(previous, point) / 1000;
      const inferredSpeed = distanceKm / (dtMs / 3600000);
      const isImplausibleJump =
        inferredSpeed > MAX_REASONABLE_SPEED_KMH ||
        (distanceKm > MAX_SINGLE_JUMP_KM && dtMs < 30 * 60 * 1000);

      if (!isImplausibleJump) {
        cleaned.push(point);
      }
    }

    return cleaned.map((point) => ({
      ...point,
      address: point.address || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
    }));
  }, [rawHistory]);

  const currentPoint = points[clampIndex(currentIndex, points.length)] ?? null;

  const routeForMap = useMemo(() => simplifyIfNeeded(points.map((p) => ({ lat: p.lat, lng: p.lng }))), [points]);

  const routePositions = useMemo<LatLngExpression[]>(
    () => routeForMap.map((p) => [p.lat, p.lng] as LatLngExpression),
    [routeForMap],
  );

  const timelineValue = useMemo(() => {
    if (points.length <= 1) return 0;
    return (clampIndex(currentIndex, points.length) / (points.length - 1)) * 100;
  }, [currentIndex, points.length]);

  const currentTime = currentPoint?.timestamp ?? "";

  const tripDistanceKm = useMemo(() => {
    if (points.length < 2) return 0;
    let total = 0;
    for (let i = 1; i < points.length; i += 1) {
      total += getDistanceMeters(points[i - 1], points[i]);
    }
    return total / 1000;
  }, [points]);

  const maxSpeed = useMemo(() => {
    if (points.length === 0) return 0;
    return Math.max(...points.map((p) => p.speed));
  }, [points]);

  const avgSpeed = useMemo(() => {
    if (points.length === 0) return 0;
    return points.reduce((sum, p) => sum + p.speed, 0) / points.length;
  }, [points]);

  const alertCount = useMemo(() => points.filter((point) => Boolean(point.alertType)).length, [points]);

  const mapCenter = useMemo<LatLngExpression>(() => {
    if (!vehicleId) return INDIA_DEFAULT_CENTER;
    if (animatedPos) return [animatedPos.lat, animatedPos.lng];
    if (currentPoint) return [currentPoint.lat, currentPoint.lng];
    if (points[0]) return [points[0].lat, points[0].lng];
    return INDIA_DEFAULT_CENTER;
  }, [animatedPos, currentPoint, points, vehicleId]);

  useEffect(() => {
    if (points.length === 0) return;

    if (currentIndex === 0 || lastIndexRef.current >= points.length) {
      const start = points[0];
      const raf = requestAnimationFrame(() => {
        setAnimatedPos({ lat: start.lat, lng: start.lng });
      });
      lastIndexRef.current = 0;
      return () => cancelAnimationFrame(raf);
    }

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const fromIndex = clampIndex(lastIndexRef.current, points.length);
    const toIndex = clampIndex(currentIndex, points.length);
    const from = points[fromIndex];
    const to = points[toIndex];

    const duration = Math.max(120, 450 / playbackSpeed);
    const startedAt = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startedAt) / duration, 1);
      const lat = from.lat + (to.lat - from.lat) * t;
      const lng = from.lng + (to.lng - from.lng) * t;

      setAnimatedPos({ lat, lng });

      if (followVehicle && leafletMapRef.current) {
        leafletMapRef.current.panTo([lat, lng], { animate: true, duration: 0.2 });
      }

      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);
    lastIndexRef.current = toIndex;

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [currentIndex, followVehicle, playbackSpeed, points]);

  useEffect(() => {
    if (!isPlaying || points.length <= 1) return;

    const frameInterval = Math.max(40, Math.round(500 / playbackSpeed));
    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => {
        const next = prev + 1;
        if (next >= points.length) {
          setIsPlaying(false);
          return points.length - 1;
        }
        return next;
      });
    }, frameInterval);

    return () => window.clearInterval(timer);
  }, [isPlaying, playbackSpeed, points.length]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (vehicleId) return;

    setIsPlaying(false);
    setCurrentIndex(0);
    setAnimatedPos(null);
    lastIndexRef.current = 0;

    if (leafletMapRef.current) {
      leafletMapRef.current.setView(INDIA_DEFAULT_CENTER, 5, { animate: true });
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId || points.length === 0) return;

    const latestIndex = points.length - 1;
    const latestPoint = points[latestIndex];

    setIsPlaying(false);
    setCurrentIndex(latestIndex);
    lastIndexRef.current = latestIndex;
    setAnimatedPos({ lat: latestPoint.lat, lng: latestPoint.lng });

    if (leafletMapRef.current) {
      leafletMapRef.current.setView([latestPoint.lat, latestPoint.lng], 15, { animate: true });
    }
  }, [vehicleId, points]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();

    if (!vehicleId) {
      toast.error("Please select a vehicle");
      return;
    }

    if (!showAllHistory && (!dateFrom || !dateTo)) {
      toast.error("Please select both From and To date/time");
      return;
    }

    if (!showAllHistory && dateFrom && dateTo && new Date(dateTo) <= new Date(dateFrom)) {
      toast.error("End date must be after start date");
      return;
    }

    setCurrentIndex(0);
    setIsPlaying(false);
    lastIndexRef.current = 0;
    setShouldFetch(true);
  };

  const handleQuickDate = (range: "yesterday" | "lastweek" | "lastmonth") => {
    const now = new Date();
    const from = new Date(now);

    if (range === "yesterday") from.setDate(now.getDate() - 1);
    if (range === "lastweek") from.setDate(now.getDate() - 7);
    if (range === "lastmonth") from.setDate(now.getDate() - 30);

    setShowAllHistory(false);
    setDateFrom(from.toISOString().slice(0, 16));
    setDateTo(now.toISOString().slice(0, 16));
    setShouldFetch(false);
  };

  const handlePlay = () => {
    if (points.length > 1) setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
    lastIndexRef.current = 0;
    if (points[0]) {
      setAnimatedPos({ lat: points[0].lat, lng: points[0].lng });
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => clampIndex(prev + 1, points.length));
  };

  const handlePrevious = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => clampIndex(prev - 1, points.length));
  };

  const handleTimelineChange = (value: number) => {
    if (points.length === 0) return;
    const nextIndex = clampIndex(Math.floor((value / 100) * points.length), points.length);
    setIsPlaying(false);
    setCurrentIndex(nextIndex);
  };

  const zoomToRoute = () => {
    if (!leafletMapRef.current || points.length === 0) return;
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    leafletMapRef.current.fitBounds(bounds, { padding: [30, 30] });
  };

  const getVehicleDisplayName = (vehicle: VehicleOption) => {
    return vehicle.vehicleNumber || vehicle.registrationNumber || vehicle.plateNumber || vehicle.name || vehicle._id;
  };

  const isLoading = isHistoryLoading || isFetching;
  const hasError = Boolean(vehiclesError || historyError);

  return (
    <ApiErrorBoundary hasError={hasError}>
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Professional History</p>
                <h1 className="text-xl font-black text-gray-900">Vehicle Playback</h1>
              </div>
              <div className="text-sm font-semibold text-gray-700">
                {points.length > 0 ? `${currentIndex + 1}/${points.length}` : "0 points"}
              </div>
            </div>

            <form onSubmit={handleSearch} className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">Vehicle</label>
                <select
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
                  value={vehicleId}
                  onChange={(event) => {
                    setVehicleId(event.target.value);
                    setCurrentIndex(0);
                    setIsPlaying(false);
                    setAnimatedPos(null);
                    lastIndexRef.current = 0;
                    setShouldFetch(showAllHistory);
                  }}
                >
                  <option value="">Select Vehicle...</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle._id} value={vehicle._id}>
                      {getVehicleDisplayName(vehicle)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">From</label>
                <input
                  type="datetime-local"
                  required={!showAllHistory}
                  disabled={showAllHistory}
                  value={dateFrom}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setShouldFetch(false);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">To</label>
                <input
                  type="datetime-local"
                  required={!showAllHistory}
                  disabled={showAllHistory}
                  value={dateTo}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setShouldFetch(false);
                  }}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
                />
              </div>

              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={showAllHistory ? "border-green-500 bg-green-50 text-green-700" : ""}
                  onClick={() => {
                    const next = !showAllHistory;
                    setShowAllHistory(next);
                    setShouldFetch(next);
                  }}
                >
                  <Calendar size={14} className="mr-1" />
                  {showAllHistory ? "All" : "Range"}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Search className="mr-1 h-4 w-4" />}
                  Load
                </Button>
              </div>

              <div className="flex items-end gap-2 text-gray-900">
                <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate("yesterday")}>Yesterday</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate("lastweek")}>Last Week</Button>
              </div>

              <div className="flex items-end gap-2 text-gray-900">
                <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate("lastmonth")}>Last Month</Button>
              </div>
            </form>
          </div>
        </div>

        <div className="grid min-h-[calc(100vh-180px)] grid-cols-1 lg:grid-cols-[1fr_340px]">
          <div className="border-r border-gray-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-4 py-3 text-gray-900">
              <Button size="sm" onClick={handlePrevious} disabled={currentIndex <= 0 || points.length === 0}>
                <SkipBack size={14} />
              </Button>
              <Button size="sm" onClick={isPlaying ? handlePause : handlePlay} disabled={points.length <= 1}>
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </Button>
              <Button size="sm" onClick={handleStop} disabled={points.length === 0}>
                <RotateCcw size={14} />
              </Button>
              <Button size="sm" onClick={handleNext} disabled={currentIndex >= points.length - 1 || points.length === 0}>
                <SkipForward size={14} />
              </Button>

              <select
                className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                value={playbackSpeed}
                onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
              </select>

              <Button size="sm" variant={followVehicle ? "default" : "outline"} onClick={() => setFollowVehicle((prev) => !prev)}>
                <Navigation size={14} className="mr-1" />
                Follow
              </Button>

              <Button size="sm" variant="outline" onClick={zoomToRoute} disabled={points.length === 0}>
                <ZoomIn size={14} className="mr-1" />
                Zoom to route
              </Button>
            </div>

            <div className="px-4 py-3">
              <input
                type="range"
                min={0}
                max={100}
                value={timelineValue}
                onChange={(event) => handleTimelineChange(Number(event.target.value))}
                disabled={points.length === 0}
                className="w-full"
              />
              <div className="mt-1 text-xs text-gray-500">
                {currentTime ? new Date(currentTime).toLocaleString() : "No timestamp"}
              </div>
            </div>

            <div className="h-[calc(100vh-310px)] min-h-[400px] p-4">
              <div className="relative h-full overflow-hidden rounded-lg border border-gray-300 bg-gray-100">
                <MapContainer
                  center={mapCenter}
                  zoom={vehicleId ? 12 : 5}
                  className="h-full w-full"
                  dragging={true}
                  scrollWheelZoom={true}
                  doubleClickZoom={true}
                  touchZoom={true}
                  boxZoom={true}
                  keyboard={true}
                  zoomControl={true}
                  whenReady={(event: any) => {
                    return leafletMapRef.current = event.target;
                  }}
                >
                  <MapTileLayer satellite={false} />

                  {routePositions.length > 1 && <Polyline positions={routePositions} pathOptions={{ color: "#2563eb", weight: 4 }} />}

                  {points[0] && <Marker position={[points[0].lat, points[0].lng]}><Popup>Route Start</Popup></Marker>}
                  {points.length > 1 && (
                    <Marker position={[points[points.length - 1].lat, points[points.length - 1].lng]}>
                      <Popup>Route End</Popup>
                    </Marker>
                  )}

                  {(animatedPos || currentPoint) && (
                    <Marker position={[animatedPos?.lat ?? currentPoint!.lat, animatedPos?.lng ?? currentPoint!.lng]}>
                      <Popup>
                        <div className="text-xs">
                          <div>{new Date(currentTime).toLocaleString()}</div>
                          <div>Speed: {(currentPoint?.speed ?? 0).toFixed(1)} km/h</div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </MapContainer>

                {points.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80">
                    <div className="text-center text-sm text-gray-700">
                      <MapPin className="mx-auto mb-2" size={20} />
                      Load history to display route and playback.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="bg-white p-4">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Telemetry</h3>
            <div className="space-y-3">
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                  <span>Time</span>
                  <Clock size={12} />
                </div>
                <div className="text-sm font-semibold text-gray-900">{currentTime ? new Date(currentTime).toLocaleTimeString() : "--:--:--"}</div>
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                  <span>Speed</span>
                  <Gauge size={12} />
                </div>
                <div className="text-sm font-semibold text-gray-900">{(currentPoint?.speed ?? 0).toFixed(1)} km/h</div>
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                  <span>Driver</span>
                  <Navigation size={12} />
                </div>
                <button
                  onClick={() => setIsDriverModalOpen(true)}
                  className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  {driverName}
                </button>
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
                  <span>Location</span>
                  <MapPin size={12} />
                </div>
                <div className="text-xs text-gray-900">{currentPoint?.address ?? "Unknown location"}</div>
              </div>

              <div className="rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
                <div className="mb-1 font-semibold text-gray-900">Journey Summary</div>
                <div>Total points: {points.length}</div>
                <div>Rendered points: {routeForMap.length}</div>
                <div>Distance: {tripDistanceKm.toFixed(2)} km</div>
                <div>Max speed: {maxSpeed.toFixed(1)} km/h</div>
                <div>Avg speed: {avgSpeed.toFixed(1)} km/h</div>
                <div>Alerts: {alertCount}</div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Driver Modal */}
      {isDriverModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-[1000] flex items-center justify-center p-4" onClick={() => setIsDriverModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-emerald-500/20 p-2">
                  <User size={20} className="text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest truncate">Driver Profile</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight truncate">{selectedVehicle?.vehicleNumber || 'Unknown Vehicle'}</p>
                </div>
              </div>
              <button onClick={() => setIsDriverModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Full Name</span>
                <div className="text-base font-black text-gray-900">{driverName}</div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 border border-gray-200">
                  <Phone size={16} className="text-emerald-400" />
                  <div>
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Phone Number</div>
                    <div className="text-xs font-bold text-gray-700">
                      {typeof selectedVehicle?.driverId === 'object' && 'phone' in selectedVehicle.driverId ? selectedVehicle.driverId.phone : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 border border-gray-200">
                  <Mail size={16} className="text-blue-400" />
                  <div>
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Email Address</div>
                    <div className="text-xs font-bold text-gray-700">
                      {typeof selectedVehicle?.driverId === 'object' && 'email' in selectedVehicle.driverId ? selectedVehicle.driverId.email : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 border border-gray-200">
                  <FileText size={16} className="text-amber-400" />
                  <div>
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">License Number</div>
                    <div className="text-xs font-bold text-gray-700">
                      {typeof selectedVehicle?.driverId === 'object' && 'licenseNumber' in selectedVehicle.driverId ? selectedVehicle.driverId.licenseNumber : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 border border-gray-200">
                  <MapPin size={16} className="text-red-400 mt-0.5" />
                  <div>
                    <div className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Address</div>
                    <div className="text-xs font-bold text-gray-700 leading-tight">
                      {typeof selectedVehicle?.driverId === 'object' && 'address' in selectedVehicle.driverId ? selectedVehicle.driverId.address : "N/A"}
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => setIsDriverModalOpen(false)} className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-black text-white uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </ApiErrorBoundary>
  );
}