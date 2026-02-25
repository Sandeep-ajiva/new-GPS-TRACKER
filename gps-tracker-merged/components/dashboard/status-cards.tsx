import { Car, Clock, AlertOctagon, PowerOff, Database } from "lucide-react"
import type { Vehicle } from "@/lib/vehicles"

export type VehicleStatusFilter = "running" | "idle" | "stopped" | "inactive" | "nodata" | "total" | "active"

export function StatusCards({
    activeFilter = "total",
    onFilterChange,
    vehicles = [],
}: {
    activeFilter?: VehicleStatusFilter
    onFilterChange?: (filter: VehicleStatusFilter) => void
    vehicles?: Vehicle[]
}) {
    const totals = vehicles.reduce(
        (acc, vehicle) => {
            acc.total += 1
            if (vehicle.status === "running") acc.running += 1
            if (vehicle.status === "idle") acc.idle += 1
            if (vehicle.status === "stopped") acc.stopped += 1
            if (vehicle.status === "inactive") acc.inactive += 1
            if (vehicle.status === "nodata") acc.nodata += 1
            return acc
        },
        { running: 0, idle: 0, stopped: 0, inactive: 0, nodata: 0, total: 0 }
    )

    const stats = [
        { label: "Running", count: totals.running, color: "bg-emerald-400", textColor: "text-slate-950", icon: Car, filter: "running" as const },
        { label: "Idle", count: totals.idle, color: "bg-amber-300", textColor: "text-slate-950", icon: Clock, filter: "idle" as const },
        { label: "Stopped", count: totals.stopped, color: "bg-red-500", textColor: "text-white", icon: AlertOctagon, filter: "stopped" as const },
        { label: "Inactive", count: totals.inactive, color: "bg-cyan-500", textColor: "text-slate-950", icon: PowerOff, filter: "inactive" as const },
        { label: "No Data", count: totals.nodata, color: "bg-slate-500", textColor: "text-white", icon: Database, filter: "nodata" as const },
        { label: "Total", count: totals.total, color: "bg-white/90", textColor: "text-slate-900", filter: "total" as const },
    ]

    return (
        <div className="grid grid-cols-2 gap-1.5 p-2 sm:grid-cols-3 lg:grid-cols-6 xl:gap-2">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    onClick={() => onFilterChange?.(stat.filter)}
                    className={`${stat.color} ${stat.textColor || 'text-white'} flex flex-col items-center justify-center rounded-xl border border-white/5 py-1.5 shadow-lg relative overflow-hidden group h-16 sm:h-18 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ring-offset-2 ring-offset-slate-950 ${activeFilter === stat.filter ? "ring-2 ring-emerald-400 shadow-emerald-400/20" : "hover:shadow-xl"}`}
                >
                    <div className="flex items-center gap-1.5 mb-0.5">
                        {stat.icon && <stat.icon className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100" />}
                        <span className="text-base sm:text-lg font-black leading-none">{stat.count}</span>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest opacity-80 group-hover:opacity-100">{stat.label}</span>

                    {/* Subtle highlight effect */}
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
            ))}
        </div>
    )
}
