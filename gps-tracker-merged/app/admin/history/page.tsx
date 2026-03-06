"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search, Loader2, Activity, AlertOctagon, Gauge, Timer, Clock3, Zap, MapPin, Play, Pause, SkipBack, SkipForward, Copy, Calendar, Filter, List, Map } from "lucide-react";
import { toast } from "sonner";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Dynamically import Map
const HistoryMap = dynamic(() => import("@/components/admin/Map/HistoryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-100" />
});
const RoutePath = dynamic(() => import("@/components/admin/Map/RoutePath"), {
    ssr: false,
    loading: () => <div className="h-64 w-full animate-pulse rounded-2xl bg-slate-900/40" />
});
const HistoryPlaybackMap = dynamic(() => import("@/components/admin/Map/HistoryPlaybackMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900/40" />
});
import type { StopFilter } from "@/components/admin/Map/HistoryPlaybackMap";

type RawHistoryPoint = {
    _id?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
    currentMileage?: number;
    mainInputVoltage?: number;
    gsmSignalStrength?: number;
    ignitionStatus?: boolean;
    ignition?: boolean;
    alertType?: string;
    alertIdentifier?: string;
    event?: string;
    gpsTimestamp?: string;
    receivedAt?: string;
    address?: string;
};

type RoutePoint = {
    lat: number;
    lng: number;
    timestamp: string;
    speed: number;
    location: string;
    ignition: boolean;
    alertType?: string;
    mileage?: number;
    voltage?: number;
    gsm?: number;
};

type RouteSegment = {
    id: string;
    dateKey: string;
    label: string;
    startTime: string;
    endTime: string;
    pointCount: number;
    avgSpeed: number;
    maxSpeed: number;
    points: RoutePoint[];
};

const SEGMENT_GAP_MS = 30 * 60 * 1000;
const toKmDistance = (meters: number) => meters / 1000;
const toRad = (v: number) => (v * Math.PI) / 180;
const haversine = (a: RoutePoint, b: RoutePoint) => {
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const parseLocalDateTime = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : value; // keep local, avoid UTC shift
};

const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });

const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    });

const formatDuration = (fromTs: string, toTs: string) => {
    const diff = Math.max(0, new Date(toTs).getTime() - new Date(fromTs).getTime());
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
};

// 🔐 ORG CONTEXT UPDATE
import { useOrgContext } from "@/hooks/useOrgContext";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

export default function HistoryPage() {
    // 🔐 ORG CONTEXT UPDATE
    const { isSuperAdmin } = useOrgContext();
    const [selectedOrgId, setSelectedOrgId] = useState("");

    // Local state for form
    const [vehicleId, setVehicleId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [shouldFetch, setShouldFetch] = useState(false);
    const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
    const [playheadIndex, setPlayheadIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [stopFilter, setStopFilter] = useState<StopFilter>("all");
    const [activeTab, setActiveTab] = useState<"points" | "stops" | "events">("points");
    const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

    // API Hooks
    // 🔐 If superadmin, we can filter vehicles by org. 
    // Backend `getVehicles` should handle this param.
    const { data: vehData } = useGetVehiclesQuery({
        page: 0,
        limit: 1000,
        ...(selectedOrgId && { organizationId: selectedOrgId })
    }, { refetchOnMountOrArgChange: true });

    // 🔐 Only superadmin needs full org list
    const { data: orgData } = useGetOrganizationsQuery(undefined, {
        skip: !isSuperAdmin,
        refetchOnMountOrArgChange: true
    });

    const organizations = orgData?.data || [];

    // History Query
    // Only run query when shouldFetch is true and we have all params
    const { data: historyDataResponse, isLoading: isHistoryLoading, isFetching } = useGetVehicleHistoryQuery(
        {
            vehicleId,
            from: parseLocalDateTime(dateFrom),
            to: parseLocalDateTime(dateTo),
            page: 0,
            limit: 20000,
        },
        { skip: !shouldFetch || !vehicleId || !dateFrom || !dateTo }
    );

    const vehicles = vehData?.data || [];
    const historyList = useMemo<RawHistoryPoint[]>(
        () => historyDataResponse?.data || [],
        [historyDataResponse],
    );

    const routeSegments = useMemo<RouteSegment[]>(() => {
        const normalized: RoutePoint[] = historyList
            .map((point) => {
                const timestamp = point.gpsTimestamp || point.receivedAt || "";
                const time = new Date(timestamp).getTime();
                if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
                if (!timestamp || Number.isNaN(time)) return null;

                return {
                    lat: Number(point.latitude),
                    lng: Number(point.longitude),
                    timestamp,
                    speed: Number(point.speed || 0),
                    location: point.address || "Unknown",
                    ignition: Boolean(point.ignitionStatus ?? point.ignition ?? true),
                    alertType: point.alertType || point.alertIdentifier || point.event,
                    mileage: point.currentMileage,
                    voltage: point.mainInputVoltage,
                    gsm: point.gsmSignalStrength,
                    heading: Number(point.heading || point.course || 0),
                };
            })
            .filter(Boolean) as RoutePoint[];

        normalized.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        if (!normalized.length) return [];

        const segments: RouteSegment[] = [];
        let current: RoutePoint[] = [normalized[0]];

        for (let i = 1; i < normalized.length; i++) {
            const prev = normalized[i - 1];
            const now = normalized[i];
            const prevDate = new Date(prev.timestamp).toDateString();
            const nowDate = new Date(now.timestamp).toDateString();
            const gap = new Date(now.timestamp).getTime() - new Date(prev.timestamp).getTime();
            const newSegment = prevDate !== nowDate || gap > SEGMENT_GAP_MS;

            if (newSegment) {
                const start = current[0];
                const end = current[current.length - 1];
                const avgSpeed = Math.round(
                    current.reduce((acc, item) => acc + item.speed, 0) / Math.max(1, current.length)
                );
                const maxSpeed = Math.round(Math.max(...current.map((item) => item.speed)));
                segments.push({
                    id: `${start.timestamp}-${end.timestamp}`,
                    dateKey: new Date(start.timestamp).toDateString(),
                    label: `${formatDate(start.timestamp)} • Route ${segments.length + 1}`,
                    startTime: start.timestamp,
                    endTime: end.timestamp,
                    pointCount: current.length,
                    avgSpeed,
                    maxSpeed,
                    points: current,
                });
                current = [now];
            } else {
                current.push(now);
            }
        }

        if (current.length) {
            const start = current[0];
            const end = current[current.length - 1];
            const avgSpeed = Math.round(
                current.reduce((acc, item) => acc + item.speed, 0) / Math.max(1, current.length)
            );
            const maxSpeed = Math.round(Math.max(...current.map((item) => item.speed)));
            segments.push({
                id: `${start.timestamp}-${end.timestamp}`,
                dateKey: new Date(start.timestamp).toDateString(),
                label: `${formatDate(start.timestamp)} • Route ${segments.length + 1}`,
                startTime: start.timestamp,
                endTime: end.timestamp,
                pointCount: current.length,
                avgSpeed,
                maxSpeed,
                points: current,
            });
        }

        return segments;
    }, [historyList]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (vehicleId && dateFrom && dateTo) {
            if (new Date(dateFrom).getTime() >= new Date(dateTo).getTime()) {
                toast.error("`To` datetime must be after `From` datetime");
                return;
            }
            setSelectedRouteIndex(0);
            setShouldFetch(true);
        } else {
            toast.error("Please select vehicle and date range");
        }
    };

    const isLoading = isHistoryLoading || isFetching;

    const activePoints = useMemo(() => routeSegments.flatMap((s) => s.points), [routeSegments]);

    const summary = useMemo(() => {
        const points = activePoints;
        if (points.length < 2) return null;
        let distanceMeters = 0;
        let drivingSec = 0;
        let idleSec = 0;
        let stopSec = 0;
        let stops = 0;
        let overspeed = 0;
        let emergency = 0;
        let ignOnCount = 0;
        let maxSpeed = 0;
        let prevIgn = points[0].ignition;

        for (let i = 1; i < points.length; i++) {
            const a = points[i - 1];
            const b = points[i];
            const deltaT = Math.max(0, (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) / 1000);
            distanceMeters += haversine(a, b);
            if (b.speed > 2) drivingSec += deltaT;
            else if (b.speed === 0 && b.ignition) idleSec += deltaT;
            else if (b.speed === 0) stopSec += deltaT;
            const alert = (b.alertType || "").toLowerCase();
            if (alert.includes("over")) overspeed += 1;
            if (alert.includes("emer") || alert.includes("panic")) emergency += 1;
            if (!prevIgn && b.ignition) ignOnCount += 1;
            prevIgn = b.ignition;
            maxSpeed = Math.max(maxSpeed, b.speed);
        }
        let streak = 0;
        for (const p of points) {
            if (p.speed === 0) streak += 1;
            else {
                if (streak >= 3) stops += 1;
                streak = 0;
            }
        }
        if (streak >= 3) stops += 1;

        return {
            totalDistance: toKmDistance(distanceMeters),
            runningTime: drivingSec,
            idleTime: idleSec,
            stopTime: stopSec,
            maxSpeed,
            stops,
            overspeed,
            emergency,
            ignOnCount,
        };
    }, [activePoints]);

    const travelStats = useMemo(() => {
        if (activePoints.length < 2) return null;
        let distance = 0;
        let drive = 0;
        let idle = 0;
        let stop = 0;
        let speedSum = 0;
        let speedCount = 0;
        for (let i = 1; i < activePoints.length; i++) {
            const a = activePoints[i - 1];
            const b = activePoints[i];
            const deltaT = Math.max(0, (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) / 1000);
            distance += haversine(a, b);
            speedSum += b.speed;
            speedCount += 1;
            if (b.speed > 2) drive += deltaT;
            else if (b.speed === 0 && b.ignition) idle += deltaT;
            else if (b.speed === 0) stop += deltaT;
        }
        const currentDistance = haversine(activePoints[0], activePoints[activePoints.length - 1]) / 1000;
        return {
            travelled: distance / 1000,
            currentDistance,
            avgSpeed: speedCount ? speedSum / speedCount : 0,
            drive,
            idle,
            stop,
        };
    }, [activePoints]);

    const routeEvents = useMemo(() => {
        const ev: any[] = [];
        // stops/idles already computed via map component, but also add turns and harsh braking + stop timeline
        // Detect stops/idle using same logic as map
        let streak: typeof activePoints = [];
        for (let i = 1; i < activePoints.length; i++) {
            const prev = activePoints[i - 1];
            const cur = activePoints[i];
            // turns
            if (prev.heading != null && cur.heading != null) {
                let delta = cur.heading - prev.heading;
                if (delta > 180) delta -= 360;
                if (delta < -180) delta += 360;
                const abs = Math.abs(delta);
                if (abs >= 15) {
                    const subtype =
                        abs > 60 ? (delta > 0 ? "sharp right" : "sharp left") : delta > 0 ? "slight right" : "slight left";
                    ev.push({ type: "turn", label: subtype, timestamp: cur.timestamp, lat: cur.lat, lng: cur.lng, speed: cur.speed, ignition: cur.ignition, heading: cur.heading });
                }
            }
            // harsh brake
            if (prev.speed - cur.speed > 30) {
                ev.push({ type: "harsh brake", label: "Harsh Brake", timestamp: cur.timestamp, lat: cur.lat, lng: cur.lng, speed: cur.speed, ignition: cur.ignition, heading: cur.heading });
            }
            // stop/idle streak
            if (cur.speed === 0) {
                streak.push(cur);
            } else {
                if (streak.length > 2) {
                    const s = streak[0];
                    const e = streak[streak.length - 1];
                    ev.push({
                        type: s.ignition ? "idle" : "stop",
                        label: s.ignition ? "Idle" : "Stop",
                        timestamp: e.timestamp,
                        start: s.timestamp,
                        end: e.timestamp,
                        lat: streak[Math.floor(streak.length / 2)].lat,
                        lng: streak[Math.floor(streak.length / 2)].lng,
                        durationSec: (new Date(e.timestamp).getTime() - new Date(s.timestamp).getTime()) / 1000,
                        ignition: s.ignition,
                        heading: s.heading,
                        speed: 0,
                    });
                }
                streak = [];
            }
        }
        if (streak.length > 2) {
            const s = streak[0];
            const e = streak[streak.length - 1];
            ev.push({
                type: s.ignition ? "idle" : "stop",
                label: s.ignition ? "Idle" : "Stop",
                timestamp: e.timestamp,
                start: s.timestamp,
                end: e.timestamp,
                lat: streak[Math.floor(streak.length / 2)].lat,
                lng: streak[Math.floor(streak.length / 2)].lng,
                durationSec: (new Date(e.timestamp).getTime() - new Date(s.timestamp).getTime()) / 1000,
                ignition: s.ignition,
                heading: s.heading,
                speed: 0,
            });
        }
        return ev.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [activePoints]);

    const eventCounts = useMemo(() => {
        return {
            turns: routeEvents.filter((e) => e.type === "turn").length,
            stops: routeEvents.filter((e) => e.type === "stop").length,
            idle: routeEvents.filter((e) => e.type === "idle").length,
            harsh: routeEvents.filter((e) => e.type === "harsh brake").length,
        };
    }, [routeEvents]);

    useEffect(() => {
        setPlayheadIndex(0);
        setIsPlaying(false);
    }, [selectedRouteIndex, routeSegments.length]);

    useEffect(() => {
        if (playheadIndex >= activePoints.length) {
            setPlayheadIndex(0);
            setIsPlaying(false);
        }
    }, [activePoints.length, playheadIndex]);

    useEffect(() => {
        if (!isPlaying || activePoints.length === 0) return;
        const timer = setInterval(() => {
            setPlayheadIndex((idx) => {
                const next = idx + 1;
                if (next >= activePoints.length) {
                    setIsPlaying(false);
                    return idx;
                }
                return next;
            });
        }, 1000 / playbackSpeed);
        return () => clearInterval(timer);
    }, [isPlaying, playbackSpeed, activePoints.length]);

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="min-h-screen bg-gray-50">
                {/* STICKY TOP FILTER BAR */}
                <div className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
                    <div className="px-4 py-4">
                        <div className="mb-4">
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-gray-500">History Playback</p>
                            <h1 className="text-2xl font-black text-gray-900">Route Analytics</h1>
                        </div>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                {isSuperAdmin && (
                                    <div>
                                        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">Organization</label>
                                        <select
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            value={selectedOrgId}
                                            onChange={e => { setSelectedOrgId(e.target.value); setVehicleId(""); setShouldFetch(false); }}
                                        >
                                            <option value="">All Organizations</option>
                                            {organizations.map((org: any) => (
                                                <option key={org._id} value={org._id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">Vehicle</label>
                                    <select required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }}>
                                        <option value="">Choose Vehicle...</option>
                                        {vehicles.map((v: any) => (
                                            <option key={v._id} value={v._id}>{v.vehicleNumber || v.registrationNumber || v._id}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">From</label>
                                    <input type="datetime-local" required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }} />
                                </div>
                                <div>
                                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-gray-600">To</label>
                                    <input type="datetime-local" required className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                        value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }} />
                                </div>
                                <div className="flex items-end">
                                    <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                                        {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                                        Load History
                                    </Button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="flex h-[calc(100vh-180px)]">
                    {/* LEFT SIDE - MAP (70%) */}
                    <div className="flex-1 relative">
                        {routeSegments.length > 0 ? (
                            <>
                                {/* Map Legend Overlay */}
                                <div className="absolute top-4 left-4 z-30 bg-white/95 backdrop-blur-sm rounded-lg border border-gray-200 p-3 shadow-lg">
                                    <h4 className="text-xs font-semibold text-gray-900 mb-2">Map Legend</h4>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <span className="text-xs text-gray-700">Start Point</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                            <span className="text-xs text-gray-700">End Point</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                            <span className="text-xs text-gray-700">Events</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                            <span className="text-xs text-gray-700">Stops</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-full rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden">
                                    <HistoryPlaybackMap
                                        key={`map-${activePoints.length}`}
                                        points={activePoints as any}
                                        playheadIndex={playheadIndex}
                                        stopFilter={stopFilter}
                                        events={routeEvents as any}
                                        showControls={false}
                                        isPlaying={isPlaying}
                                        speed={playbackSpeed}
                                        onTogglePlay={() => setIsPlaying((p) => !p)}
                                        onReplay={() => { setPlayheadIndex(0); setIsPlaying(false); }}
                                        onSpeedChange={(s) => setPlaybackSpeed(s)}
                                        onStopFilterChange={(f) => setStopFilter(f)}
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                                        <MapPin size={32} className="text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No History Data</h3>
                                    <p className="text-sm text-gray-500">Select vehicle and date range to view history</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* RIGHT SIDE - DETAILS PANEL (30%) */}
                    <div className="hidden lg:block w-[30%] max-w-md border-l border-gray-200 bg-white">
                        <div className="h-full flex flex-col">
                            {/* Summary Cards */}
                            {summary && (
                                <div className="p-4 border-b border-gray-200">
                                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Trip Summary</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        <SummaryCard icon={Activity} label="Distance" value={`${summary.totalDistance.toFixed(1)} km`} />
                                        <SummaryCard icon={Timer} label="Duration" value={formatTimeLabel(summary.runningTime)} />
                                        <SummaryCard icon={Gauge} label="Max Speed" value={`${summary.maxSpeed.toFixed(0)} km/h`} />
                                        <SummaryCard icon={AlertOctagon} label="Stops" value={`${summary.stops}`} />
                                    </div>
                                </div>
                            )}

                            {/* Tabs */}
                            <div className="border-b border-gray-200">
                                <div className="flex">
                                    <button
                                        onClick={() => setActiveTab("points")}
                                        className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === "points"
                                                ? "text-blue-600 border-blue-600"
                                                : "text-gray-500 border-transparent hover:text-gray-700"
                                        }`}
                                    >
                                        <List className="w-4 h-4 inline mr-1" />
                                        Points
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("stops")}
                                        className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === "stops"
                                                ? "text-blue-600 border-blue-600"
                                                : "text-gray-500 border-transparent hover:text-gray-700"
                                        }`}
                                    >
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        Stops
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("events")}
                                        className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === "events"
                                                ? "text-blue-600 border-blue-600"
                                                : "text-gray-500 border-transparent hover:text-gray-700"
                                        }`}
                                    >
                                        <Activity className="w-4 h-4 inline mr-1" />
                                        Events
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-hidden">
                                <div className="h-full overflow-y-auto custom-scrollbar">
                                    {activeTab === "points" && (
                                        <div className="p-4 space-y-2">
                                            {activePoints.slice(0, 50).map((point, index) => (
                                                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Badge variant={point.ignition ? "success" : "secondary"} className="text-xs">
                                                                    {point.ignition ? "ON" : "OFF"}
                                                                </Badge>
                                                                <span className="text-xs text-gray-600">{point.speed.toFixed(0)} km/h</span>
                                                            </div>
                                                            <div className="text-xs text-gray-700 mb-1">
                                                                {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                {formatTime(point.timestamp)}
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => navigator.clipboard.writeText(`${point.lat}, ${point.lng}`)}
                                                            className="text-gray-400 hover:text-gray-600 transition-colors"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {activePoints.length > 50 && (
                                                <div className="text-center text-xs text-gray-500 py-2">
                                                    Showing first 50 of {activePoints.length} points
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "stops" && (
                                        <div className="p-4 space-y-2">
                                            {routeEvents.filter(e => e.type === "stop" || e.type === "idle").map((event, index) => (
                                                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Badge variant={event.type === "idle" ? "warning" : "destructive"}>
                                                            {event.label}
                                                        </Badge>
                                                        <span className="text-xs text-gray-600">
                                                            {formatDuration(event.start, event.end)}
                                                        </span>
                                                    </div>
                                                    <div className="text-xs text-gray-700 mb-1">
                                                        {formatTime(event.start)} - {formatTime(event.end)}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        Location: {event.lat.toFixed(6)}, {event.lng.toFixed(6)}
                                                    </div>
                                                </div>
                                            ))}
                                            {routeEvents.filter(e => e.type === "stop" || e.type === "idle").length === 0 && (
                                                <div className="text-center text-gray-500 py-8">
                                                    No stops detected
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {activeTab === "events" && (
                                        <div className="p-4 space-y-2">
                                            {routeEvents.map((event, index) => (
                                                <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Badge variant="outline">
                                                            {event.label}
                                                        </Badge>
                                                        {event.speed > 0 && (
                                                            <span className="text-xs text-gray-600">{event.speed.toFixed(0)} km/h</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {formatTime(event.timestamp)}
                                                    </div>
                                                </div>
                                            ))}
                                            {routeEvents.length === 0 && (
                                                <div className="text-center text-gray-500 py-8">
                                                    No events detected
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* PLAYBACK CONTROLS BAR - STICKY BOTTOM */}
                {routeSegments.length > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm">
                        <div className="px-4 py-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Button
                                        onClick={() => setIsPlaying((p) => !p)}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                                    </Button>
                                    <Button
                                        onClick={() => { setPlayheadIndex(0); setIsPlaying(false); }}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        <SkipBack size={16} />
                                    </Button>
                                    <Button
                                        onClick={() => setPlayheadIndex(Math.min(playheadIndex + 10, activePoints.length - 1))}
                                        variant="outline"
                                        size="sm"
                                        className="bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
                                    >
                                        <SkipForward size={16} />
                                    </Button>
                                    <select
                                        value={playbackSpeed}
                                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-2 py-1 focus:border-blue-500 focus:outline-none"
                                    >
                                        <option value={0.5}>0.5x</option>
                                        <option value={1}>1x</option>
                                        <option value={2}>2x</option>
                                        <option value={4}>4x</option>
                                        <option value={8}>8x</option>
                                    </select>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600">Stop Filter:</span>
                                        {(["all", "normal", "idle", "hide"] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() => setStopFilter(f)}
                                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                                                    stopFilter === f
                                                        ? "bg-blue-600 text-white"
                                                        : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                                                }`}
                                            >
                                                {f === "all" ? "All" : f === "normal" ? "Normal" : f === "idle" ? "Idle" : "Hide"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-600">
                                    {playheadIndex} / {activePoints.length} points • {playbackSpeed}x speed
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* MOBILE PANEL */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
                    <Button
                        onClick={() => setIsMobilePanelOpen(!isMobilePanelOpen)}
                        className="w-full rounded-t-none bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        <List className="w-4 h-4 mr-2" />
                        {isMobilePanelOpen ? "Hide" : "Show"} Details
                    </Button>
                    {isMobilePanelOpen && (
                        <div className="bg-white border-t border-gray-200 max-h-96 overflow-y-auto">
                            {/* Mobile tabs and content similar to desktop */}
                            <div className="border-b border-gray-200">
                                <div className="flex">
                                    <button
                                        onClick={() => setActiveTab("points")}
                                        className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === "points"
                                                ? "text-blue-600 border-blue-600"
                                                : "text-gray-500 border-transparent hover:text-gray-700"
                                        }`}
                                    >
                                        Points
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("stops")}
                                        className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === "stops"
                                                ? "text-blue-600 border-blue-600"
                                                : "text-gray-500 border-transparent hover:text-gray-700"
                                        }`}
                                    >
                                        Stops
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("events")}
                                        className={`flex-1 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${
                                            activeTab === "events"
                                                ? "text-blue-600 border-blue-600"
                                                : "text-gray-500 border-transparent hover:text-gray-700"
                                        }`}
                                    >
                                        Events
                                    </button>
                                </div>
                            </div>
                            {/* Mobile tab content would go here - simplified version */}
                            <div className="p-4">
                                <div className="text-center text-gray-500">
                                    {activeTab} content - {activePoints.length} points available
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </ApiErrorBoundary>
    );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600">
                <Icon size={18} />
            </div>
            <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{label}</div>
                <div className="text-lg font-bold text-gray-900">{value}</div>
            </div>
        </div>
    );
}

function formatTimeLabel(seconds: number) {
    const s = Math.max(0, Math.floor(seconds));
    const hh = String(Math.floor(s / 3600)).padStart(2, "0");
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${hh}:${mm}:${ss}`;
}
