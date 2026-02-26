import { Search, Info, Power, Zap, Fan, Signal, Plus, Filter } from "lucide-react"
import type { Vehicle } from "@/lib/vehicles"
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"
import { useState } from "react"
import { toast } from "sonner"
import { useAppDispatch } from "@/redux/hooks"
import { setSelectedVehicle as setReduxSelectedVehicle } from "@/redux/features/vehicleSlice"
import { useDashboardContext } from "./DashboardContext"

export function VehicleSidebar({
    vehicles,
    selectedId,
    onSelect,
    isFullWidth = false,
    statusFilter = "total"
}: {
    vehicles: Vehicle[],
    selectedId?: string | null,
    onSelect?: (id: string) => void,
    isFullWidth?: boolean,
    statusFilter?: "running" | "idle" | "stopped" | "inactive" | "nodata" | "total" | "active"
}) {
    const dispatch = useAppDispatch()
    const { selectedVehicle, setSelectedVehicle } = useDashboardContext()
    const [searchTerm, setSearchTerm] = useState("")
    const [localStatusFilter, setLocalStatusFilter] = useState<typeof statusFilter>("total")
    const [showFilters, setShowFilters] = useState(false)

    const filteredVehicles = vehicles.filter((vehicle) => {
        const matchesGlobalStatus = (() => {
            if (statusFilter === "total") return true
            if (statusFilter === "active") return vehicle.status === "running" || vehicle.status === "idle"
            return vehicle.status === statusFilter
        })()

        const matchesLocalStatus = (() => {
            if (localStatusFilter === "total") return true
            if (localStatusFilter === "active") return vehicle.status === "running" || vehicle.status === "idle"
            return vehicle.status === localStatusFilter
        })()

        const matchesSearch =
            !searchTerm.trim() ||
            (vehicle.vehicleNumber || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (vehicle.driver || "").toLowerCase().includes(searchTerm.toLowerCase())

        return matchesGlobalStatus && matchesLocalStatus && matchesSearch
    })

    const [displayLimit, setDisplayLimit] = useState(10)
    const paginatedVehicles = filteredVehicles.slice(0, displayLimit)
    const hasMore = filteredVehicles.length > displayLimit

    return (
        <div className="flex w-full flex-col border-r border-white/10 bg-slate-950/80 h-full text-slate-100 antialiased">
            <div className="p-3 border-b border-white/10 space-y-3 bg-slate-950/70">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black text-emerald-400 tracking-tighter uppercase italic">Ajiva Tracker</h2>
                    <div className="relative flex-1 ml-4 flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search Registration / Driver"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value)
                                    setDisplayLimit(10) // Reset limit on search
                                }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg py-1 pl-8 pr-3 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-medium"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[13px] text-slate-400 font-bold uppercase tracking-widest">
                    <div><span className="text-emerald-300">{filteredVehicles.length}</span> / {vehicles.length} Units</div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded border transition-all ${showFilters ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'}`}
                    >
                        <Filter className="h-3 w-3" /> Filters
                    </button>
                </div>

                {showFilters && (
                    <div className="flex flex-wrap gap-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        {["total", "running", "idle", "stopped", "inactive", "nodata"].map((f) => (
                            <button
                                key={f}
                                onClick={() => {
                                    setLocalStatusFilter(f as any)
                                    setDisplayLimit(10) // Reset limit on filter
                                }}
                                className={`px-1.5 py-0.5 rounded text-[12px] font-black uppercase tracking-tighter transition-all border ${localStatusFilter === f
                                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                                    : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300'
                                    }`}
                            >
                                {f === "total" ? "All" : f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Compact Telemetry Tracker Table */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 flex flex-col overflow-x-auto custom-scrollbar">
                    <div className="w-full flex flex-col flex-1">
                        {/* List Header (Sticky) */}
                        <div className="sticky top-0 z-10 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-lg">
                            <div className="grid gap-0 px-1 py-1 text-[11px] font-black text-slate-500 uppercase tracking-tighter grid-cols-[120px_120px_40px_40px_40px_40px_70px_1fr_60px_50px]">
                                <div className="pl-1">Vehicle</div>
                                <div>Driver</div>
                                <div className="text-center">IGN</div>
                                <div className="text-center">AC</div>
                                <div className="text-center">PW</div>
                                <div className="text-center">GPS</div>
                                <div className="text-center">Speed</div>
                                <div className="pl-1">Location</div>
                                <div className="text-center">POI</div>
                                <div className="text-center">Info</div>
                            </div>
                        </div>

                        {/* Scrollable Vehicle List */}
                        <div className="flex-1 overflow-y-auto bg-slate-950/5 custom-scrollbar">
                            {paginatedVehicles.map((v, i) => (
                                <div
                                    key={v.id || i}
                                    onClick={() => {
                                        if (onSelect) onSelect(v.id)
                                        dispatch(setReduxSelectedVehicle(v.id))
                                        setSelectedVehicle(v)
                                    }}
                                    className={`group grid gap-0 border-b border-white/5 py-0.5 px-1 text-[13px] hover:bg-emerald-500/10 cursor-pointer items-center transition-all grid-cols-[120px_120px_40px_40px_40px_40px_70px_1fr_60px_50px] ${selectedVehicle?.id === v.id || selectedId === v.id ? 'bg-emerald-500/15 border-l-2 border-l-emerald-400' : 'border-l-2 border-l-transparent'}`}
                                >
                                    <div className="min-w-0 pl-1">
                                        <div className="font-black text-slate-100 flex items-center gap-1.5 truncate">
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full shrink-0 shadow-[0_0_4px] ${v.status === 'running'
                                                    ? 'bg-emerald-400 shadow-emerald-500/40'
                                                    : v.status === 'idle'
                                                        ? 'bg-amber-400 shadow-amber-500/40'
                                                        : v.status === 'inactive'
                                                            ? 'bg-cyan-400 shadow-cyan-500/40'
                                                            : v.status === 'nodata'
                                                                ? 'bg-slate-400 shadow-slate-500/20'
                                                                : 'bg-red-500 shadow-red-500/40'
                                                    }`}
                                            />
                                            <span className="truncate uppercase leading-tight text-[12px]">{v.vehicleNumber || v.id}</span>
                                        </div>
                                    </div>

                                    <div className="truncate text-slate-400 font-medium px-0.5 text-[12px]">
                                        {v.driver}
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Power className={`h-2.5 w-2.5 ${v.ign ? "text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.5)]" : "text-white/10"}`} />
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Fan className={`h-2.5 w-2.5 ${v.ac ? "text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.5)]" : "text-white/10"}`} />
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Zap className={`h-2.5 w-2.5 ${v.pw ? "text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.5)]" : "text-white/10"}`} />
                                    </div>

                                    <div className="flex items-center justify-center">
                                        <Signal className={`h-2.5 w-2.5 ${v.gps ? "text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.5)]" : "text-white/10"}`} />
                                    </div>

                                    <div className="text-center font-black text-emerald-400 px-0.5 text-[12px]">
                                        {v.speed}<span className="text-[7px] opacity-70 ml-0.5">K</span>
                                    </div>

                                    <div className="text-[12px] text-slate-300 truncate leading-none px-0.5 font-medium italic opacity-80">
                                        {v.location}
                                    </div>

                                    <div className="text-center text-slate-500 text-[12px] font-bold truncate px-0.5">
                                        {v.poi || "-"}
                                    </div>

                                    <div className="flex justify-center">
                                        <Info className={`h-2.5 w-2.5 ${selectedVehicle?.id === v.id || selectedId === v.id ? 'text-emerald-300' : 'text-emerald-500/20 hover:text-emerald-400'}`} />
                                    </div>
                                </div>
                            ))}

                            {hasMore && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        setDisplayLimit(prev => prev + 10)
                                    }}
                                    className="w-full py-3 text-[11px] font-black text-emerald-400/60 uppercase tracking-widest hover:text-emerald-400 hover:bg-emerald-500/5 transition-all border-t border-white/5"
                                >
                                    Load More Vehicles (+10)
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
