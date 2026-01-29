import { Gauge } from "lucide-react"
import type { Vehicle } from "@/lib/vehicles"

export function ActivityStats({ vehicles = [], alertCount = 0 }: { vehicles?: Vehicle[]; alertCount?: number }) {
    const speeds = vehicles.map((vehicle) => vehicle.speed).filter((speed) => Number.isFinite(speed))
    const avgSpeed = speeds.length ? Math.round(speeds.reduce((acc, speed) => acc + speed, 0) / speeds.length) : 0
    const maxSpeed = speeds.length ? Math.max(...speeds) : 0

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

    return (
        <div className="grid grid-cols-3 gap-4 h-full">
            {/* 1. Gauge / Average Speed */}
            <div className="flex flex-col justify-between rounded-lg bg-slate-900/70 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.25)] border border-white/10 text-slate-100">
                <div className="flex justify-center py-4">
                    <Gauge className="h-16 w-16 text-emerald-300" />
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-slate-200">Avg Speed</span>
                        <span className="text-slate-100 text-lg">{avgSpeed} km/h</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium">
                        <span className="text-amber-300">Max Speed</span>
                        <span className="text-amber-300 text-lg">{maxSpeed} km/h</span>
                    </div>
                </div>
            </div>

            {/* 2. Today Activity */}
            <div className="flex flex-col rounded-lg bg-slate-900/70 shadow-[0_10px_30px_rgba(15,23,42,0.25)] overflow-hidden border border-white/10">
                <div className="bg-emerald-400/20 px-3 py-1 text-sm font-bold text-emerald-100">Today Activity</div>
                <div className="p-3 space-y-2 text-xs text-slate-200">
                    <div className="flex justify-between border-b border-white/10 border-dashed pb-2">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-400"></div> {statusTotals.total} total
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-y-1">
                        <span className="text-slate-200">Running</span>
                        <span className="text-right text-emerald-300">{statusTotals.running}</span>

                        <span className="text-slate-200 w-full">Idle</span>
                        <span className="text-right text-amber-300">{statusTotals.idle}</span>

                        <span className="text-slate-200">Stop</span>
                        <span className="text-right text-red-400">{statusTotals.stopped}</span>

                        <span className="text-slate-200">Inactive</span>
                        <span className="text-right text-cyan-300">{statusTotals.inactive}</span>
                    </div>
                </div>
            </div>

            {/* 3. Alerts & GPS */}
            <div className="flex gap-4">
                {/* Alert Column */}
                <div className="flex-1 flex flex-col rounded-lg bg-slate-900/70 shadow-[0_10px_30px_rgba(15,23,42,0.25)] overflow-hidden border border-white/10">
                    <div className="bg-red-500/20 px-3 py-1 text-sm font-bold text-red-200">Alert</div>
                    <div className="p-2 space-y-1 text-xs text-slate-200">
                        <div className="flex justify-between">
                            <span className="text-emerald-300 font-bold">Total</span>
                            <span className="text-emerald-300 font-bold">{alertCount}</span>
                        </div>
                        <div className="text-red-300 font-medium">Recent alerts</div>
                        <div className="space-y-1">
                            {alertCount ? (
                                [1, 2, 3].slice(0, Math.min(3, alertCount)).map((i) => (
                                    <div key={i} className="flex justify-between text-[10px]">
                                        <span className="text-cyan-300">alert</span>
                                        <span className="text-red-300">{i * 5} min ago</span>
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
                    <div className="bg-cyan-500/20 px-3 py-1 text-sm font-bold text-cyan-100">GPS Device Parameters</div>
                    <div className="p-3 text-xs space-y-2 text-slate-200">
                        <div className="flex justify-between">
                            <span className="text-slate-200">Int Battery</span>
                            <span className="text-slate-100">NA</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-200">Satellite</span>
                            <span className="text-cyan-300 font-bold">6</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-200">Int Battery %</span>
                            <span className="text-slate-100">100.00</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
