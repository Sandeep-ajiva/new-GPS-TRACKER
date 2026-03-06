"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Gauge, Timer, Activity, Clock3, Bell, Trash2, X } from "lucide-react";
import type { Vehicle } from "@/lib/vehicles";
import type { VehiclePositions } from "@/lib/use-vehicle-positions";
import { TelemetryGrid } from "./telemetry-grid";

type DailyStats = {
    totalDistance?: number
    maxSpeed?: number
    avgSpeed?: number
    runningTime?: number
    idleTime?: number
    stoppedTime?: number
    inactiveTime?: number
}

type AlertItem = {
    _id?: string
    alertName?: string
    severity?: string
    gpsTimestamp?: string
}

const toRelativeTime = (value?: string) => {
    if (!value) return "just now";
    const ts = new Date(value).getTime();
    if (Number.isNaN(ts)) return "just now";
    const diffMins = Math.max(0, Math.floor((Date.now() - ts) / 60000));
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    const hours = Math.floor(diffMins / 60);
    if (hours < 24) return `${hours} h ago`;
    const days = Math.floor(hours / 24);
    return `${days} d ago`;
};

export function VehicleDetails({
    vehicleId,
    positions,
    vehicles = [],
    selectedVehicleObj,
    dailyStats,
    alerts = [],
}: {
    vehicleId?: string | null;
    positions: VehiclePositions;
    vehicles?: Vehicle[];
    selectedVehicleObj?: Vehicle | null;
    dailyStats?: DailyStats | null;
    alerts?: AlertItem[];
}) {
    if (!vehicleId && !selectedVehicleObj) return null;
    const vehicle = selectedVehicleObj || vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return null;

    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertItems, setAlertItems] = useState<AlertItem[]>(alerts);

    useEffect(() => {
        setAlertItems(alerts);
    }, [alerts]);

    const orderedAlerts = useMemo(
        () =>
            [...alertItems].sort((a, b) => {
                const at = new Date(a.gpsTimestamp || 0).getTime();
                const bt = new Date(b.gpsTimestamp || 0).getTime();
                return bt - at;
            }),
        [alertItems]
    );

    const recentAlert = orderedAlerts.length > 0 ? orderedAlerts[0] : null;
    const fleet = vehicles.reduce(
        (acc, item) => {
            acc.total += 1;
            if (item.status === "running") acc.running += 1;
            if (item.status === "idle") acc.idle += 1;
            return acc;
        },
        { total: 0, running: 0, idle: 0 }
    );

    return (
        <div className="rounded-2xl bg-[#111827] p-4 space-y-5">
            <div className="bg-[#1C2533] rounded-2xl p-5 shadow-lg shadow-black/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate text-xl font-bold text-white">Vehicle No: {vehicle.vehicleNumber}</h3>
                        <div className="text-xs text-gray-400">
                            Type: {(vehicle as any).vehicleType || `${vehicle.make || ""} ${vehicle.model || ""}`.trim() || "Vehicle"}
                        </div>
                        <div className="text-xs text-gray-400">Last updated: {vehicle.date || "N/A"}</div>
                    </div>
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${vehicle.status === "running"
                            ? "bg-green-500/20 text-green-400"
                            : vehicle.status === "idle"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : vehicle.status === "inactive"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-gray-500/20 text-gray-300"
                            }`}
                    >
                        {vehicle.status}
                    </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-xl bg-[#111827] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">Total Fleet</div>
                        <div className="mt-1 text-xl font-bold text-white">{fleet.total}</div>
                    </div>
                    <div className="rounded-xl bg-[#111827] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">Running</div>
                        <div className="mt-1 text-xl font-bold text-green-400">{fleet.running}</div>
                    </div>
                    <div className="rounded-xl bg-[#111827] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">Idle</div>
                        <div className="mt-1 text-xl font-bold text-yellow-300">{fleet.idle}</div>
                    </div>
                    <div className="rounded-xl bg-[#111827] p-3 text-center">
                        <div className="text-[10px] uppercase tracking-wide text-gray-400">Alerts</div>
                        <div className="mt-1 text-xl font-bold text-red-400">{orderedAlerts.length}</div>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 md:grid-cols-5">
                <div className="space-y-5 md:col-span-3">
                    <div className="bg-[#1C2533] rounded-2xl p-4 shadow-lg shadow-black/20">
                        <div className="mb-3 text-sm font-semibold text-white">Daily Performance</div>
                        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                            <div className="rounded-xl bg-[#111827] p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Avg Speed</span>
                                    <Gauge size={13} className="text-gray-500" />
                                </div>
                                <div className="mt-1 text-lg font-bold text-white">
                                    {dailyStats?.avgSpeed || 0} <span className="text-xs text-gray-400">km/h</span>
                                </div>
                            </div>
                            <div className="rounded-xl bg-[#111827] p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Max Speed</span>
                                    <Activity size={13} className="text-gray-500" />
                                </div>
                                <div className="mt-1 text-lg font-bold text-white">
                                    {dailyStats?.maxSpeed || 0} <span className="text-xs text-gray-400">km/h</span>
                                </div>
                            </div>
                            <div className="rounded-xl bg-[#111827] p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Run Time</span>
                                    <Timer size={13} className="text-gray-500" />
                                </div>
                                <div className="mt-1 text-lg font-bold text-white">{dailyStats?.runningTime || 0}</div>
                            </div>
                            <div className="rounded-xl bg-[#111827] p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wide text-gray-400">Idle Time</span>
                                    <Clock3 size={13} className="text-gray-500" />
                                </div>
                                <div className="mt-1 text-lg font-bold text-white">{dailyStats?.idleTime || 0}</div>
                            </div>
                        </div>
                    </div>

                    <div className={`bg-[#1C2533] rounded-2xl p-4 shadow-lg shadow-black/20 ${recentAlert ? "border-l-4 border-red-500" : "border-l-4 border-green-500"}`}>
                        <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-white">Recent Alert</div>
                            <button
                                type="button"
                                onClick={() => setIsAlertModalOpen(true)}
                                className="inline-flex items-center gap-1 rounded-lg bg-[#111827] px-2 py-1 text-xs text-gray-200 transition-colors hover:bg-[#0b1220]"
                            >
                                <Bell size={12} />
                                Notifications
                            </button>
                        </div>
                        {recentAlert ? (
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-red-400">
                                    <AlertTriangle size={14} />
                                    <span className="text-sm font-medium text-white">{recentAlert.alertName || "N/A"}</span>
                                </div>
                                <div className="text-xs text-gray-400 uppercase">{recentAlert.severity || "N/A"}</div>
                                <div className="text-xs text-gray-400">{toRelativeTime(recentAlert.gpsTimestamp || "")}</div>
                            </div>
                        ) : (
                            <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2 text-green-400 text-sm">
                                    <CheckCircle2 size={14} />
                                    <span className="text-white">No recent alert</span>
                                </div>
                                <div className="text-xs text-gray-400">System normal</div>
                            </div>
                        )}
                    </div>

                    <div className="bg-[#1C2533] rounded-2xl p-4 shadow-lg shadow-black/20">
                        <div className="mb-3 text-sm font-semibold text-white">Vehicle Specifications</div>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">Make & Model</span>
                                <span className="text-white text-right">{vehicle.make} {vehicle.model}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">Year</span>
                                <span className="text-white text-right">{vehicle.year || "N/A"}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">Color</span>
                                <span className="text-white text-right capitalize">{vehicle.color || "N/A"}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">Registration No.</span>
                                <span className="text-white text-right">{vehicle.vehicleNumber || "N/A"}</span>
                            </div>
                            <div className="flex justify-between gap-3 col-span-2">
                                <span className="text-gray-400">AIS-140 Status</span>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${vehicle.ais140Compliant ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-300"}`}>
                                    {vehicle.ais140Compliant ? "Compliant" : "Standard"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-5 md:col-span-2">
                    <div className="bg-[#1C2533] rounded-2xl p-4 shadow-lg shadow-black/20">
                        <div className="mb-2 text-sm font-semibold text-white">Live Telemetry</div>
                        <TelemetryGrid vehicle={vehicle} />
                    </div>

                    <div className="bg-[#1C2533] rounded-2xl p-4 shadow-lg shadow-black/20">
                        <div className="mb-2 text-sm font-semibold text-white">Location Details</div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">Address</span>
                                <span className="text-white text-right">{vehicle.location || "N/A"}</span>
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">Coordinates</span>
                                <span className="font-mono text-white text-right">
                                    {positions[vehicle.id]
                                        ? `${positions[vehicle.id]?.lat.toFixed(6)}, ${positions[vehicle.id]?.lng.toFixed(6)}`
                                        : "N/A"}
                                </span> 
                            </div>
                            <div className="flex justify-between gap-3">
                                <span className="text-gray-400">POI</span>
                                <span className="text-gray-300 text-right">{vehicle.poi || "No Landmark Near"}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {isAlertModalOpen && (
                <div
                    className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
                    onClick={() => setIsAlertModalOpen(false)}
                >
                    <div
                        className="w-full max-w-2xl rounded-2xl bg-[#1C2533] shadow-2xl shadow-black/40"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                            <div className="flex items-center gap-2 text-white">
                                <Bell size={16} className="text-red-400" />
                                <h4 className="text-sm font-semibold">Notifications</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAlertModalOpen(false)}
                                className="rounded-md p-1 text-gray-300 transition-colors hover:bg-[#111827] hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="max-h-[420px] overflow-y-auto p-4 space-y-2">
                            {orderedAlerts.length > 0 ? (
                                orderedAlerts.map((item, index) => (
                                    <div key={item._id || `${item.alertName || "alert"}-${index}`} className="rounded-xl bg-[#111827] p-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-semibold text-white">{item.alertName || "Unknown Alert"}</div>
                                                <div className="mt-1 text-xs uppercase text-gray-400">{item.severity || "N/A"}</div>
                                                <div className="mt-1 text-xs text-gray-400">{toRelativeTime(item.gpsTimestamp || "")}</div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const key = item._id || `${item.alertName || "alert"}-${index}`;
                                                    setAlertItems((prev) =>
                                                        prev.filter((entry, entryIndex) => {
                                                            const entryKey = entry._id || `${entry.alertName || "alert"}-${entryIndex}`;
                                                            return entryKey !== key;
                                                        })
                                                    );
                                                }}
                                                className="inline-flex items-center gap-1 rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300 transition-colors hover:bg-red-500/30"
                                            >
                                                <Trash2 size={12} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="rounded-xl bg-[#111827] p-4 text-sm text-gray-300">
                                    No notifications available.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
