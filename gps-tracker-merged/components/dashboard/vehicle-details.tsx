"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, Battery, CheckCircle2, Cpu, Gauge, Navigation, User } from "lucide-react";
import type { Vehicle } from "@/lib/vehicles";
import type { VehiclePositions } from "@/lib/use-vehicle-positions";
import { useGetVehicleLatestHealthQuery } from "@/redux/api/healthMonitoringApi";

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

const formatDuration = (seconds?: number): string => {
    const total = Math.max(0, Math.floor(Number(seconds || 0)));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

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

const DetailRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-3 border-b border-[#edf3e8] py-1.5 last:border-b-0">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
    </div>
)

const MetricBox = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="rounded-2xl border border-[#dbe7d4] bg-white px-3 py-2.5">
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</div>
        <div className="mt-1.5 text-xl font-black tracking-tight text-slate-900 break-words">{value}</div>
    </div>
)

const SectionPill = ({ color, title }: { color: string; title: string }) => (
    <span
        className="inline-flex rounded-full px-4 py-1.5 text-xs font-black tracking-[0.08em] text-white"
        style={{ backgroundColor: color }}
    >
        {title}
    </span>
)

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
    const vehicle = useMemo(
        () => selectedVehicleObj || vehicles.find((item) => item.id === vehicleId) || null,
        [selectedVehicleObj, vehicles, vehicleId]
    );
    const { data: healthRes } = useGetVehicleLatestHealthQuery(vehicleId || "", {
        skip: !vehicleId,
        pollingInterval: 60000,
        refetchOnMountOrArgChange: true,
    });
    const health = healthRes?.data || null;

    const orderedAlerts = useMemo(
        () =>
            [...alerts].sort((a, b) => {
                const at = new Date(a.gpsTimestamp || 0).getTime();
                const bt = new Date(b.gpsTimestamp || 0).getTime();
                return bt - at;
            }),
        [alerts]
    );

    const recentAlert = orderedAlerts.length > 0 ? orderedAlerts[0] : null;

    if (!vehicleId && !selectedVehicleObj) return null;
    if (!vehicle) return null;

    const currentPosition = positions[vehicle.id];
    const coordinates = currentPosition
        ? `${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)}`
        : "N/A";
    const latestStatusLabel =
        vehicle.status === "running"
            ? "Running"
            : vehicle.status === "idle"
                ? "Idle"
                : vehicle.status === "inactive"
                    ? "Inactive"
                    : vehicle.status === "nodata"
                        ? "No Data"
                        : "Stopped";

    return (
        <div className="space-y-3 rounded-[26px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-start justify-between">
                        <SectionPill color="#3b82f6" title="Speed" />
                        <Gauge className="h-8 w-8 text-[#0b5c8e]" />
                    </div>
                    <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-600">Avg Speed</span>
                            <span className="text-xl font-black text-[#0b5c8e]">{dailyStats?.avgSpeed ?? 0}<span className="ml-1 text-sm font-semibold">km/h</span></span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-600">Max Speed</span>
                            <span className="text-xl font-black text-red-500">{dailyStats?.maxSpeed ?? 0}<span className="ml-1 text-sm font-semibold">km/h</span></span>
                        </div>
                        <div className="flex items-center justify-between text-sm border-t border-slate-100 pt-1.5">
                            <span className="font-medium text-amber-500 italic">Speed Limit</span>
                            <span className="text-sm font-black text-slate-400 font-mono tracking-tighter">60 km/h</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <SectionPill color="#22c55e" title="Today Activity" />
                        <span className="text-lg font-black text-[#3e8d11]">{(dailyStats?.totalDistance ?? 0).toFixed(2)} km</span>
                    </div>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700">Running</span>
                            <span className="font-semibold text-[#3e8d11]">{formatDuration(dailyStats?.runningTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700">Idle</span>
                            <span className="font-semibold text-[#ef8a22]">{formatDuration(dailyStats?.idleTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700">Stop</span>
                            <span className="font-semibold text-[#ef5b4d]">{formatDuration(dailyStats?.stoppedTime)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-slate-700">Inactive</span>
                            <span className="font-semibold text-[#4da2e9]">{formatDuration(dailyStats?.inactiveTime)}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <SectionPill color="#ef4444" title="Alert" />
                        <span className="text-xl font-black text-[#3e8d11]">{orderedAlerts.length}</span>
                    </div>

                    {recentAlert ? (
                        <div className="space-y-1.5 text-sm">
                            <div className="flex items-center justify-between gap-3">
                                <span className="truncate text-slate-700">Recent alerts</span>
                                <span className="font-semibold text-red-500">{toRelativeTime(recentAlert.gpsTimestamp || "")}</span>
                            </div>
                            <div className="text-[#0b5c8e]">{recentAlert.alertName || "N/A"}</div>
                            <div className="text-red-500">{recentAlert.severity || "Status unavailable"}</div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[#2f8d35]">
                                <CheckCircle2 size={16} />
                                <span className="text-sm font-bold text-slate-900">No recent alert</span>
                            </div>
                            <p className="text-sm font-medium text-slate-500">System normal</p>
                        </div>
                    )}
                </div>

                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-4">
                        <SectionPill color="#0b5c8e" title="GPS Device Parameters" />
                    </div>
                    <div className="space-y-2">
                        <DetailRow label="Int Battery" value={vehicle.batteryVoltage != null ? vehicle.batteryVoltage : "N/A"} />
                        <DetailRow label="Satellite" value={vehicle.satelliteCount != null ? vehicle.satelliteCount : "N/A"} />
                        <DetailRow label="Int Battery %" value={vehicle.batteryPercent != null ? vehicle.batteryPercent : "N/A"} />
                        <DetailRow label="GSM Signal" value={vehicle.gsmSignal != null ? vehicle.gsmSignal : "N/A"} />
                        <DetailRow label="Fuel" value={vehicle.fuel != null ? `${vehicle.fuel}%` : "N/A"} />
                    </div>
                </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.05fr_0.95fr_1.2fr_0.95fr]">
                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="grid gap-3 md:grid-cols-[auto_1fr_auto]">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0b78b8] text-white shadow-sm">
                            <User className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-base font-medium text-slate-800">{vehicle.driver || "Unassigned"}</p>
                            <p className="text-sm text-slate-500">Driver</p>
                            <div className="mt-3 h-1.5 w-full rounded-full bg-slate-200">
                                <div className="h-1.5 rounded-full bg-[#3e8d11]" style={{ width: vehicle.gps ? "50%" : "10%" }} />
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#0b78b8]">{vehicle.registrationNumber || vehicle.vehicleNumber || "N/A"}</p>
                            <span className={`mt-2 inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold text-white ${vehicle.status === "stopped" ? "bg-[#ef5b4d]" : vehicle.status === "running" ? "bg-[#3e8d11]" : vehicle.status === "idle" ? "bg-[#ef8a22]" : "bg-[#4da2e9]"}`}>
                                {latestStatusLabel}
                            </span>
                            <p className="mt-2 text-xs text-slate-500">{vehicle.date || "N/A"}</p>
                        </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <MetricBox label="Current Trip" value={dailyStats?.totalDistance != null ? `${dailyStats.totalDistance} km` : "N/A"} />
                        <MetricBox label="Speed" value={`${vehicle.speed || 0} km/h`} />
                    </div>
                </div>

                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <Navigation className="h-4 w-4 text-[#0b5c8e]" />
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Location</div>
                    </div>
                    <p className="text-sm font-medium leading-6 text-slate-600">{vehicle.location || "Unknown"}</p>
                    <p className="mt-3 font-mono text-sm text-slate-500">{coordinates}</p>
                </div>

                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Vehicle Specification</p>
                        <h4 className="mt-1 text-lg font-black text-slate-900">Master Information</h4>
                    </div>
                    <div className="space-y-1">
                        <DetailRow label="Make / Model" value={`${vehicle.make || "N/A"} ${vehicle.model || ""}`.trim()} />
                        <DetailRow label="Year" value={vehicle.year || "N/A"} />
                        <DetailRow label="Color" value={vehicle.color || "N/A"} />
                        <DetailRow label="Registration No" value={vehicle.registrationNumber || vehicle.vehicleNumber || "N/A"} />
                        <DetailRow
                            label="AIS Status"
                            value={
                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${vehicle.ais140Compliant ? "bg-[#ecf8ea] text-[#2f8d35]" : "bg-slate-100 text-slate-600"}`}>
                                    {vehicle.ais140Compliant ? "Compliant" : "N/A"}
                                </span>
                            }
                        />
                    </div>
                </div>

                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-3">
                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Location Details</p>
                        <h4 className="mt-1 text-lg font-black text-slate-900">Current coordinates</h4>
                    </div>
                    <div className="grid gap-3">
                        <MetricBox label="Address" value={vehicle.location || "Unknown"} />
                        <MetricBox label="Coordinates" value={coordinates} />
                        <MetricBox label="POI" value={vehicle.poi || "-"} />
                    </div>
                </div>
            </div>

            <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm xl:hidden">
                <div className="mb-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Location Details</p>
                    <h4 className="mt-1 text-lg font-black text-slate-900">Current coordinates</h4>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                    <MetricBox label="Address" value={vehicle.location || "Unknown"} />
                    <MetricBox label="Coordinates" value={coordinates} />
                    <MetricBox label="POI" value={vehicle.poi || "-"} />
                </div>
            </div>
            {/* ── Device Health (from $HLM packets) ── */}
            {health && (
                <div className="rounded-[22px] border border-[#dbe7d4] bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                        <SectionPill color="#7c3aed" title="Device Health" />
                        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                            {health.timestamp
                                ? `Last: ${new Date(health.timestamp).toLocaleTimeString("en-GB")}`
                                : "Live"}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                        {/* Battery % */}
                        <div className="rounded-xl border border-[#dbe7d4] bg-[#f8fcf7] p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Battery size={12} className={
                                    (health.batteryPercentage ?? 100) <= (health.lowBatteryThreshold ?? 20)
                                        ? "text-red-500"
                                        : "text-[#2f8d35]"
                                } />
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    HLM Battery
                                </p>
                            </div>
                            {health.batteryPercentage !== undefined ? (
                                <>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full ${
                                                health.batteryPercentage <= (health.lowBatteryThreshold ?? 20)
                                                    ? "bg-red-500"
                                                    : health.batteryPercentage <= 40
                                                        ? "bg-amber-500"
                                                        : "bg-[#38a63c]"
                                            }`}
                                            style={{ width: `${health.batteryPercentage}%` }}
                                        />
                                    </div>
                                    <p className={`text-base font-black ${
                                        health.batteryPercentage <= (health.lowBatteryThreshold ?? 20)
                                            ? "text-red-600"
                                            : "text-slate-900"
                                    }`}>
                                        {health.batteryPercentage}%
                                        {health.batteryPercentage <= (health.lowBatteryThreshold ?? 20) && (
                                            <AlertTriangle size={11} className="inline ml-1 text-red-500" />
                                        )}
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-slate-400">N/A</p>
                            )}
                        </div>

                        {/* Memory % */}
                        <div className="rounded-xl border border-[#dbe7d4] bg-[#f8fcf7] p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Cpu size={12} className={
                                    (health.memoryPercentage ?? 0) >= 80 ? "text-amber-500" : "text-[#2f8d35]"
                                } />
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Memory
                                </p>
                            </div>
                            {health.memoryPercentage !== undefined ? (
                                <>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full rounded-full ${
                                                health.memoryPercentage >= 90
                                                    ? "bg-red-500"
                                                    : health.memoryPercentage >= 70
                                                        ? "bg-amber-500"
                                                        : "bg-blue-500"
                                            }`}
                                            style={{ width: `${health.memoryPercentage}%` }}
                                        />
                                    </div>
                                    <p className={`text-base font-black ${
                                        health.memoryPercentage >= 80 ? "text-amber-600" : "text-slate-900"
                                    }`}>
                                        {health.memoryPercentage}%
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-slate-400">N/A</p>
                            )}
                        </div>

                        {/* Firmware */}
                        <div className="rounded-xl border border-[#dbe7d4] bg-[#f8fcf7] p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                                <Activity size={12} className="text-[#2f8d35]" />
                                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                                    Firmware
                                </p>
                            </div>
                            <p className="text-sm font-black font-mono text-slate-900">
                                {health.softwareVersion || "N/A"}
                            </p>
                            {health.vendorId && (
                                <p className="text-[10px] text-slate-400 mt-0.5">{health.vendorId}</p>
                            )}
                        </div>

                        {/* Update Rate IGN ON */}
                        <div className="rounded-xl border border-[#dbe7d4] bg-[#f8fcf7] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                Rate (IGN ON)
                            </p>
                            <p className="text-base font-black text-slate-900">
                                {health.dataUpdateRateIgnitionOn !== undefined
                                    ? `${health.dataUpdateRateIgnitionOn}s`
                                    : "N/A"}
                            </p>
                        </div>

                        {/* Update Rate IGN OFF */}
                        <div className="rounded-xl border border-[#dbe7d4] bg-[#f8fcf7] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                Rate (IGN OFF)
                            </p>
                            <p className="text-base font-black text-slate-900">
                                {health.dataUpdateRateIgnitionOff !== undefined
                                    ? `${health.dataUpdateRateIgnitionOff}s`
                                    : "N/A"}
                            </p>
                        </div>

                        {/* Digital I/O */}
                        <div className="rounded-xl border border-[#dbe7d4] bg-[#f8fcf7] p-3">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 mb-2">
                                Digital I/O
                            </p>
                            <p className="text-sm font-black font-mono text-slate-900">
                                {health.digitalInputStatus || "0000"}
                            </p>
                            {health.analogInputStatus && (
                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                    A: {health.analogInputStatus}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
