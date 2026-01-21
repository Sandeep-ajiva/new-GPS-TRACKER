import { Search, Info, Power, Zap, Fan, Signal, Pencil, Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { vehicles } from "@/lib/vehicles"

export function VehicleSidebar({
    selectedId,
    onSelect,
    isFullWidth = false,
    statusFilter = "total"
}: {
    selectedId?: string | null,
    onSelect?: (id: string) => void,
    isFullWidth?: boolean,
    statusFilter?: "running" | "idle" | "stopped" | "inactive" | "nodata" | "total" | "active"
}) {
    const filteredVehicles = vehicles.filter((vehicle) => {
        if (statusFilter === "total") return true
        if (statusFilter === "active") return vehicle.status === "running" || vehicle.status === "idle"
        return vehicle.status === statusFilter
    })

    return (
        <div className="flex w-full flex-col border-r border-white/10 bg-slate-950/80 h-full text-slate-100">
            <div className="p-4 border-b border-white/10 space-y-4 bg-slate-950/70">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-emerald-200">Ajiva Tracker</h2>
                    <div className="flex items-center gap-2">
                        <Button size="icon" variant="outline" className="h-8 w-8 rounded-full border-white/20 bg-white/5">
                            <Plus className="h-4 w-4 text-slate-200" />
                        </Button>
                        <Button size="icon" className="bg-emerald-400 hover:bg-emerald-300 h-8 w-8 rounded-full text-slate-900">
                            <Search className="h-4 w-4 text-white" />
                        </Button>
                    </div>
                </div>
                <div className="text-sm text-slate-300">
                    <span className="font-bold text-emerald-300">{vehicles.length} Car</span> in my tracker
                </div>

                <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-emerald-400 hover:bg-emerald-300 h-7 text-xs text-slate-900">All</Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-white/10 bg-white/5 text-slate-200">Hired</Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-white/10 bg-white/5 text-slate-200">Available</Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-white/10 bg-white/5 text-slate-200">Service</Button>
                    <Button variant="outline" size="sm" className="flex-1 h-7 text-xs border-white/10 bg-white/5 text-slate-200">Withdrawn</Button>
                </div>
            </div>

            {/* List Header */}
            <div className="border-b border-white/10 bg-slate-900/70 overflow-x-auto">
                <div className={`grid gap-1 p-2 text-[10px] font-bold text-slate-300 ${isFullWidth ? "min-w-245 grid-cols-[150px_110px_40px_40px_40px_40px_70px_minmax(220px,1fr)_60px_70px]" : "min-w-245 grid-cols-[140px_100px_40px_40px_40px_40px_70px_minmax(200px,1fr)_60px_70px]"}`}>
                    <div>Vehicle</div>
                    <div>Driver</div>
                    <div className="text-center">IGN</div>
                    <div className="text-center">AC</div>
                    <div className="text-center">PW</div>
                    <div className="text-center">GPS</div>
                    <div className="text-center">Speed</div>
                    <div>Location</div>
                    <div className="text-center">POI</div>
                    <div className="text-center">Info</div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {filteredVehicles.map((v, i) => (
                    <div
                        key={i}
                        onClick={() => onSelect?.(v.id)}
                        className={`group grid gap-1 border-b border-white/5 p-2 text-xs hover:bg-emerald-500/10 cursor-pointer items-center transition-colors min-w-245
                            ${isFullWidth ? "grid-cols-[150px_110px_40px_40px_40px_40px_70px_minmax(220px,1fr)_60px_70px]" : "grid-cols-[140px_100px_40px_40px_40px_40px_70px_minmax(200px,1fr)_60px_70px]"}
                            ${selectedId === v.id ? 'bg-emerald-500/15 border-l-4 border-l-emerald-400' : ''}
                        `}
                    >
                        <div>
                            <div className="font-bold text-slate-100 flex items-center gap-1">
                                <span className={`h-2 w-2 rounded-full ${v.status === 'running' ? 'bg-emerald-400' : v.status === 'stopped' ? 'bg-red-500' : 'bg-amber-400'}`} />
                                {v.id}
                            </div>
                            <div className="text-[10px] text-slate-400">{v.date}</div>
                        </div>

                        <div>
                            <div className="font-semibold text-slate-200">{v.driver}</div>
                            <div className="text-[10px] text-slate-400">Driver</div>
                        </div>

                        <div className="flex items-center justify-center">
                            <Power className={`h-4 w-4 ${v.ign ? "text-green-600" : "text-red-500"}`} />
                        </div>

                        <div className="flex items-center justify-center">
                            <Fan className={`h-4 w-4 ${v.ac ? "text-green-600" : "text-red-500"}`} />
                        </div>

                        <div className="flex items-center justify-center">
                            <Zap className={`h-4 w-4 ${v.pw ? "text-green-600" : "text-red-500"}`} />
                        </div>

                        <div className="flex items-center justify-center">
                            <Signal className={`h-4 w-4 ${v.gps ? "text-green-600" : "text-red-500"}`} />
                        </div>

                        <div className="text-center font-bold text-slate-200">{v.speed} km/h</div>

                        <div className="text-[10px] text-slate-300 truncate leading-tight">
                            {v.location}
                            <div className="text-[9px] text-slate-500">{v.route[v.route.length - 1].lat},{v.route[v.route.length - 1].lng}</div>
                        </div>

                        <div className="text-center text-slate-300">{v.poi}</div>

                        <div className="flex justify-center">
                            <div className="flex items-center gap-1">
                                <button
                                    className="rounded p-1 hover:bg-white/10"
                                    title="View"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <Info className={`h-4 w-4 ${selectedId === v.id ? 'text-emerald-300' : 'text-emerald-400'}`} />
                                </button>
                                <button
                                    className="rounded p-1 hover:bg-white/10"
                                    title="Edit"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <Pencil className="h-4 w-4 text-slate-400 hover:text-emerald-300" />
                                </button>
                                <button
                                    className="rounded p-1 hover:bg-white/10"
                                    title="Delete"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
