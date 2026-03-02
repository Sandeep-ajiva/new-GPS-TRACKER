"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";

// Dynamically import Map
const HistoryMap = dynamic(() => import("@/components/admin/Map/HistoryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-100" />
});

type RawHistoryPoint = {
    _id?: string;
    latitude?: number;
    longitude?: number;
    speed?: number;
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

const parseLocalDateTime = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
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
            limit: 5000,
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

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">History</p>
                        <h1 className="text-2xl font-black text-slate-900">Playback</h1>
                        <p className="text-sm text-slate-500">Review trips by vehicle and time range.</p>
                    </div>
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end w-full">
                        {/* 🔐 ORG CONTEXT UPDATE */}
                        {isSuperAdmin && (
                            <div className="flex-1 min-w-55">
                                <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Filter by Org</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
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
                        <div className="flex-1 min-w-55">
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Select Vehicle</label>
                            <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }}>
                                <option value="">Choose Vehicle...</option>
                                {vehicles.map((v: { _id: string; vehicleNumber?: string; model?: string }) => (
                                    <option key={v._id} value={v._id}>{v.vehicleNumber} {v.model ? `(${v.model})` : ""}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">From Date/Time</label>
                            <input type="datetime-local" required className="rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }} />
                        </div>
                        <div>
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">To Date/Time</label>
                            <input type="datetime-local" required className="rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); setSelectedRouteIndex(0); }} />
                        </div>
                        <button type="submit" disabled={isLoading} className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2 inline" /> : <Search size={16} className="mr-2 inline" />}
                            {isLoading ? "Loading..." : "View History"}
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    <div className="lg:col-span-1 h-full min-h-75">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                            <h3 className="text-sm font-black text-slate-900 mb-4 shrink-0">Routes</h3>
                            {routeSegments.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                    {routeSegments.map((segment, idx) => (
                                        <div
                                            key={segment.id}
                                            onClick={() => setSelectedRouteIndex(idx)}
                                            className={`p-3 rounded-lg border cursor-pointer transition ${selectedRouteIndex === idx
                                                ? "bg-blue-50 border-blue-200"
                                                : "bg-slate-50 border-slate-100 hover:bg-slate-100"
                                                }`}
                                        >
                                            <div className="text-xs font-semibold text-slate-900">{segment.label}</div>
                                            <div className="mt-1 text-[10px] text-slate-600">
                                                {formatTime(segment.startTime)} → {formatTime(segment.endTime)} ({formatDuration(segment.startTime, segment.endTime)})
                                            </div>
                                            <div className="mt-1 text-[10px] text-slate-600">
                                                Points: {segment.pointCount} | Avg: {segment.avgSpeed} km/h | Max: {segment.maxSpeed} km/h
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-slate-400 text-center py-8 flex-1 flex items-center justify-center">
                                    {shouldFetch && !isLoading ? "No history data found for this period." : "Select parameters to view route."}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-2 relative flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm overflow-hidden h-full min-h-100">
                        {routeSegments.length > 0 ? (
                            <HistoryMap
                                routes={routeSegments.map((segment) => segment.points)}
                                selectedRouteIndex={selectedRouteIndex}
                            />
                        ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                                <Search size={48} className="mb-4 opacity-20" />
                                <p className="font-semibold">Select vehicle and date range to view history</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ApiErrorBoundary>
    );
}
