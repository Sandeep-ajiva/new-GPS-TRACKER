"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search, Loader2, Activity, AlertOctagon, Gauge, Timer, Clock3, Zap, MapPin } from "lucide-react";
import { toast } from "sonner";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";

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
            <div className="space-y-6">
                {/* Filters */}
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md">
                    <div className="mb-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-400">History Playback</p>
                        <h1 className="text-2xl font-black text-white">Route Analytics</h1>
                    </div>
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 items-end">
                        {isSuperAdmin && (
                            <div>
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Organization</label>
                                <select
                                    className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
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
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">Vehicle</label>
                            <select required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }}>
                                <option value="">Choose Vehicle...</option>
                                {vehicles.map((v: any) => (
                                    <option key={v._id} value={v._id}>{v.vehicleNumber || v.registrationNumber || v._id}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">From</label>
                            <input type="datetime-local" required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }} />
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-400">To</label>
                                <input type="datetime-local" required className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
                                    value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }} />
                            </div>
                            <button type="submit" disabled={isLoading} className="h-10 self-end rounded-lg bg-emerald-500 px-4 text-sm font-semibold text-emerald-950 shadow hover:bg-emerald-400 disabled:opacity-60">
                                {isLoading ? <Loader2 className="animate-spin w-4 h-4 inline" /> : "View"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Main split */}
                <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
                    {/* Left panel */}
                    <div className="lg:col-span-3 space-y-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md">
                            <h3 className="text-sm font-semibold text-white mb-3">Route Summary</h3>
                            {summary ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <SummaryCard icon={Activity} label="Travelled Distance" value={`${summary.totalDistance.toFixed(2)} km`} />
                                    <SummaryCard icon={Timer} label="Driving Duration" value={formatTimeLabel(summary.runningTime)} />
                                    <SummaryCard icon={Clock3} label="Idle Duration" value={formatTimeLabel(summary.idleTime)} />
                                    <SummaryCard icon={AlertOctagon} label="Stops" value={`${summary.stops}`} />
                                    <SummaryCard icon={Gauge} label="Max Speed" value={`${summary.maxSpeed.toFixed(1)} km/h`} />
                                    <SummaryCard icon={Zap} label="Ignition On" value={`${summary.ignOnCount}`} />
                                    <SummaryCard icon={Search} label="Turns" value={`${eventCounts.turns}`} />
                                    <SummaryCard icon={Search} label="Harsh Brakes" value={`${eventCounts.harsh}`} />
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400">Run a query to see summary.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-md space-y-3">
                            <h3 className="text-sm font-semibold text-white">Playback Controls</h3>
                            <div className="flex flex-wrap items-center gap-2">
                                <button onClick={() => setIsPlaying((p) => !p)} className="rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-emerald-950 shadow hover:bg-emerald-400">
                                    {isPlaying ? "Pause" : "Play"}
                                </button>
                                <button onClick={() => { setPlayheadIndex(0); setIsPlaying(false); }} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-white hover:bg-white/5">
                                    Replay
                                </button>
                                <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white">
                                    {[1, 2, 3].map((s) => <option key={s} value={s}>{s}x</option>)}
                                </select>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-300">Stop Filter:</span>
                                {(["all", "normal", "idle", "hide"] as const).map((f) => (
                                    <button key={f} onClick={() => setStopFilter(f)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${stopFilter === f ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-200"}`}>
                                        {f === "all" ? "All" : f === "normal" ? "Normal Stops" : f === "idle" ? "Idle Stops" : "Hide"}
                                    </button>
                                ))}
                            </div>
                            <div className="text-xs text-slate-300">
                                {activePoints.length} points • Speed {playbackSpeed}x
                            </div>
                        </div>

                    </div>

                    {/* Right panel */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="rounded-xl border border-slate-800 bg-slate-900 shadow-md overflow-hidden relative" style={{ height: 500 }}>
                            {routeSegments.length > 0 ? (
                                <HistoryPlaybackMap
                                    key={`map-${activePoints.length}`}
                                    points={activePoints as any}
                                    playheadIndex={playheadIndex}
                                    stopFilter={stopFilter}
                                    events={routeEvents as any}
                                    showControls
                                    isPlaying={isPlaying}
                                    speed={playbackSpeed}
                                    onTogglePlay={() => setIsPlaying((p) => !p)}
                                    onReplay={() => { setPlayheadIndex(0); setIsPlaying(false); }}
                                    onSpeedChange={(s) => setPlaybackSpeed(s)}
                                    onStopFilterChange={(f) => setStopFilter(f)}
                                />
                            ) : (
                                <div className="flex h-[500px] w-full flex-col items-center justify-center text-slate-400">
                                    <Search size={48} className="mb-4 opacity-20" />
                                    <p className="font-semibold">Select vehicle and date range to view history</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </div>
        </ApiErrorBoundary>
    );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 shadow-lg shadow-black/15 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-200">
                <Icon size={18} />
            </div>
            <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div>
                <div className="text-lg font-bold text-white">{value}</div>
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
