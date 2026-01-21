import { Car, Clock, AlertOctagon, PowerOff, Database } from "lucide-react"
import { vehicles } from "@/lib/vehicles"

export type VehicleStatusFilter = "running" | "idle" | "stopped" | "inactive" | "nodata" | "total" | "active"

export function StatusCards({
    activeFilter = "total",
    onFilterChange,
}: {
    activeFilter?: VehicleStatusFilter
    onFilterChange?: (filter: VehicleStatusFilter) => void
}) {
    const totals = vehicles.reduce(
        (acc, vehicle) => {
            acc.total += 1
            if (vehicle.status === "running") acc.running += 1
            if (vehicle.status === "idle") acc.idle += 1
            if (vehicle.status === "stopped") acc.stopped += 1
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
        <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat, i) => (
                <div
                    key={stat.label}
                    onClick={() => onFilterChange?.(stat.filter)}
                    className={`${stat.color} ${stat.textColor || 'text-white'} flex flex-col items-center justify-center rounded-xl border border-white/10 py-2 shadow-[0_10px_30px_rgba(15,23,42,0.25)] relative overflow-hidden group h-28 transition-all hover:brightness-105 cursor-pointer ${activeFilter === stat.filter ? "ring-2 ring-emerald-200/60" : ""}`}
                >
                    {stat.icon && <stat.icon className="h-6 w-6 mb-1 opacity-80" />}
                    <span className="text-2xl font-bold leading-none">{stat.count}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide">{stat.label}</span>
                </div>
            ))}
        </div>
    )
}
