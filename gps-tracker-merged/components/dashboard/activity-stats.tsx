import { Gauge } from "lucide-react"
import type { Vehicle } from "@/lib/vehicles"

type AlertItem = {
    _id?: string
    vehicleId?: string | { _id?: string }
    alertName?: string
    severity?: string
    gpsTimestamp?: string
    receivedAt?: string
    createdAt?: string
}

type DailyStats = {
    totalDistance?: number
    maxSpeed?: number
    avgSpeed?: number
    runningTime?: number
    idleTime?: number
    stoppedTime?: number
}

const toVehicleId = (item: AlertItem) => {
    if (typeof item.vehicleId === "string") return item.vehicleId
    return item.vehicleId?._id || null
}

const toRelativeTime = (value?: string) => {
    if (!value) return "just now"
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return "just now"
    const diffMins = Math.max(0, Math.floor((Date.now() - ts) / 60000))
    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins} min ago`
    const hours = Math.floor(diffMins / 60)
    if (hours < 24) return `${hours} h ago`
    const days = Math.floor(hours / 24)
    return `${days} d ago`
}

export function ActivityStats({
    vehicles = [],
    alertCount = 0,
    alerts = [],
    selectedVehicleId,
    selectedVehicleObj,
    compact = false,
    dailyStats,
}: {
    vehicles?: Vehicle[]
    alertCount?: number
    alerts?: AlertItem[]
    selectedVehicleId?: string | null
    selectedVehicleObj?: Vehicle | null
    compact?: boolean
    dailyStats?: DailyStats | null
}) {
    const speeds = vehicles.map((vehicle) => vehicle.speed).filter((speed) => Number.isFinite(speed))
    const computedAvgSpeed = speeds.length ? Math.round(speeds.reduce((acc, speed) => acc + speed, 0) / speeds.length) : 0
    const computedMaxSpeed = speeds.length ? Math.max(...speeds) : 0
    const avgSpeed = Number.isFinite(Number(dailyStats?.avgSpeed)) ? Math.round(Number(dailyStats?.avgSpeed)) : computedAvgSpeed
    const maxSpeed = Number.isFinite(Number(dailyStats?.maxSpeed)) ? Math.round(Number(dailyStats?.maxSpeed)) : computedMaxSpeed
    const selectedVehicle = selectedVehicleObj || (selectedVehicleId ? vehicles.find((item) => item.id === selectedVehicleId) : vehicles[0])

    const filteredAlerts = selectedVehicleId
        ? alerts.filter((item) => toVehicleId(item) === selectedVehicleId)
        : alerts
    const recentAlerts = [...filteredAlerts]
        .sort((a, b) => {
            const at = new Date(a.gpsTimestamp || a.receivedAt || a.createdAt || 0).getTime()
            const bt = new Date(b.gpsTimestamp || b.receivedAt || b.createdAt || 0).getTime()
            return bt - at
        })
        .slice(0, 3)

    const statusTotals = vehicles.reduce(
        (acc, vehicle) => {
            acc.total += 1
            if (vehicle.status === "running") acc.running += 1
            if (vehicle.status === "idle") acc.idle += 1
            if (vehicle.status === "stopped") acc.stopped += 1
            if (vehicle.status === "inactive") acc.inactive += 1
            return acc
        },
        { running: 0, idle: 0, stopped: 0, inactive: 0, total: 0 }
    )
    const statusFromDaily =
        dailyStats &&
            (Number(dailyStats.runningTime || 0) > 0 ||
                Number(dailyStats.idleTime || 0) > 0 ||
                Number(dailyStats.stoppedTime || 0) > 0)
            ? {
                ...statusTotals,
                running: Number(dailyStats.runningTime || 0),
                idle: Number(dailyStats.idleTime || 0),
                stopped: Number(dailyStats.stoppedTime || 0),
                total:
                    Number(dailyStats.runningTime || 0) +
                    Number(dailyStats.idleTime || 0) +
                    Number(dailyStats.stoppedTime || 0),
            }
            : statusTotals

    if (compact) {
        return (
            <div className="grid h-full min-h-0 grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="rounded-xl border border-white/10 bg-slate-900/50 p-2.5 text-xs text-slate-100 backdrop-blur-sm group hover:bg-slate-900/80 transition-colors">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400 group-hover:text-slate-300">
                            <Gauge className="h-3.5 w-3.5 text-emerald-400" />
                            Avg Speed
                        </span>
                        <span className="font-black text-emerald-400">{avgSpeed} <span className="text-[10px]">km/h</span></span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-1.5">
                        <span className="text-slate-400 group-hover:text-slate-300">Max Speed</span>
                        <span className="font-black text-amber-400">{maxSpeed} <span className="text-[10px]">km/h</span></span>
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/50 p-2.5 text-xs text-slate-100 backdrop-blur-sm hover:bg-slate-900/80 transition-colors">
                    <div className="font-black text-emerald-200 uppercase tracking-widest text-[10px] mb-1.5 opacity-80">Activity Today</div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Run</span>
                            <span className="font-bold text-emerald-400">{statusFromDaily.running}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Idle</span>
                            <span className="font-bold text-amber-400">{statusFromDaily.idle}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Stop</span>
                            <span className="font-bold text-red-500">{statusFromDaily.stopped}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Inact</span>
                            <span className="font-bold text-cyan-500">{statusFromDaily.inactive}</span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-slate-900/50 p-2.5 text-xs text-slate-100 backdrop-blur-sm hover:bg-slate-900/80 transition-colors flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="font-black text-red-200 uppercase tracking-widest text-[10px] opacity-80">Recent Alert</span>
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="mt-2 font-bold text-slate-200 truncate leading-tight">
                        {recentAlerts[0]?.alertName || "No recent alerts"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1 font-medium">
                        {recentAlerts.length > 0 ? `${alertCount} total alerts today` : "Systems normal"}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="grid h-full grid-cols-3 gap-2">
            {/* 1. Gauge / Average Speed */}
            <div className="flex flex-col justify-between rounded-lg bg-slate-900/70 p-3 shadow-[0_10px_30px_rgba(15,23,42,0.25)] border border-white/10 text-slate-100">
                <div className="flex justify-center py-2">
                    <Gauge className="h-12 w-12 text-emerald-300" />
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-slate-200">Avg Speed</span>
                        <span className="text-slate-100 text-xl font-semibold">{avgSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-medium">
                        <span className="text-amber-300">Max Speed</span>
                        <span className="text-amber-300 text-base font-semibold">{maxSpeed} km/h</span>
                    </div>
                </div>
            </div>

            {/* 2. Today Activity */}
            <div className="flex flex-col rounded-lg bg-slate-900/70 shadow-[0_10px_30px_rgba(15,23,42,0.25)] overflow-hidden border border-white/10">
                <div className="bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-100">Today Activity</div>
                <div className="p-2.5 space-y-1.5 text-xs text-slate-200">
                    <div className="flex justify-between border-b border-white/10 border-dashed pb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-400"></div> {statusFromDaily.total} total
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1">
                        <span className="text-slate-200">Running</span>
                        <span className="text-right text-emerald-300">{statusFromDaily.running}</span>

                        <span className="text-slate-200 w-full">Idle</span>
                        <span className="text-right text-amber-300">{statusFromDaily.idle}</span>

                        <span className="text-slate-200">Stop</span>
                        <span className="text-right text-red-400">{statusFromDaily.stopped}</span>

                        <span className="text-slate-200">Inactive</span>
                        <span className="text-right text-cyan-300">{statusFromDaily.inactive}</span>
                    </div>
                </div>
            </div>

            {/* 3. Alerts & GPS */}
            <div className="flex gap-4">
                {/* Alert Column */}
                <div className="flex-1 flex flex-col rounded-lg bg-slate-900/70 shadow-[0_10px_30px_rgba(15,23,42,0.25)] overflow-hidden border border-white/10">
                    <div className="bg-red-500/20 px-3 py-1 text-xs font-bold text-red-200">Alert</div>
                    <div className="p-2 space-y-0.5 text-xs text-slate-200">
                        <div className="flex justify-between">
                            <span className="text-emerald-300 font-bold">Total</span>
                            <span className="text-emerald-300 font-bold">{alertCount}</span>
                        </div>
                        <div className="text-red-300 font-medium">Recent alerts</div>
                        <div className="space-y-1">
                            {recentAlerts.length ? (
                                recentAlerts.map((item) => (
                                    <div key={item._id || item.alertName} className="flex justify-between gap-1 text-[10px]">
                                        <span className="truncate text-cyan-300">{item.alertName || "Alert"}</span>
                                        <span className="text-red-300">{toRelativeTime(item.gpsTimestamp || item.receivedAt || item.createdAt)}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-[10px] text-slate-400">No alerts yet</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* GPS Params Column */}
                <div className="flex-1 flex flex-col rounded-lg bg-slate-900/70 shadow-[0_10px_30px_rgba(15,23,42,0.25)] overflow-hidden border border-white/10">
                    <div className="bg-cyan-500/20 px-3 py-1 text-xs font-bold text-cyan-100">GPS Device Parameters</div>
                    <div className="p-2.5 text-xs space-y-1.5 text-slate-200">
                        <div className="flex justify-between">
                            <span className="text-slate-200">Int Battery</span>
                            <span className="text-slate-100">
                                {selectedVehicle?.batteryVoltage != null ? `${selectedVehicle.batteryVoltage}V` : "NA"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-200">Satellite</span>
                            <span className="text-cyan-300 font-bold">
                                {selectedVehicle?.satelliteCount ?? "NA"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-200">Int Battery %</span>
                            <span className="text-slate-100">
                                {selectedVehicle?.batteryPercent != null ? Number(selectedVehicle.batteryPercent).toFixed(2) : "NA"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
