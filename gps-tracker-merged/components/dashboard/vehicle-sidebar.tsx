import { Filter, Fan, Power, Search, Signal, Zap } from "lucide-react"
import type { Vehicle } from "@/lib/vehicles"
import { useState } from "react"
import { useAppDispatch } from "@/redux/hooks"
import { setSelectedVehicle as setReduxSelectedVehicle } from "@/redux/features/vehicleSlice"
import { useDashboardContext } from "./DashboardContext"

const statusTone = {
    running: "bg-[#38a63c]",
    idle: "bg-[#f3a338]",
    stopped: "bg-[#ef5b4d]",
    inactive: "bg-[#4da2e9]",
    nodata: "bg-[#a0a7b4]",
}

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

        const needle = searchTerm.trim().toLowerCase()
        const matchesSearch =
            !needle ||
            (vehicle.vehicleNumber || "").toLowerCase().includes(needle) ||
            (vehicle.id || "").toLowerCase().includes(needle) ||
            (vehicle.driver || "").toLowerCase().includes(needle) ||
            (vehicle.brand || "").toLowerCase().includes(needle) ||
            (vehicle.make || "").toLowerCase().includes(needle) ||
            (vehicle.vehicleBrand || "").toLowerCase().includes(needle) ||
            (vehicle.model || "").toLowerCase().includes(needle) ||
            (vehicle.vehicleModel || "").toLowerCase().includes(needle)

        return matchesGlobalStatus && matchesLocalStatus && matchesSearch
    })

    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 20
    const totalPages = Math.ceil(filteredVehicles.length / itemsPerPage)
    const paginatedVehicles = filteredVehicles.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    )

    return (
        <div className={`flex h-full w-full flex-col bg-white ${isFullWidth ? "" : "rounded-[24px]"} text-slate-800`}>
            <div className="border-b border-[#dbe7d4] bg-[#f7fbf5] p-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-[#1f3b1f]">AjivaTracker</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            {filteredVehicles.length} of {vehicles.length} vehicles
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowFilters((prev) => !prev)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${showFilters
                            ? "border-[#38a63c]/30 bg-[#ecf8ea] text-[#2f8d35]"
                            : "border-[#d6e3d0] bg-white text-slate-500 hover:border-[#38a63c]/20 hover:text-[#2f8d35]"
                            }`}
                    >
                        <Filter className="h-3.5 w-3.5" />
                        Filters
                    </button>
                </div>

                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search registration / driver"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setCurrentPage(1)
                        }}
                        className="w-full rounded-2xl border border-[#d6e3d0] bg-white py-3 pl-10 pr-4 text-sm font-medium text-slate-700 outline-none transition focus:border-[#38a63c]/40 focus:ring-2 focus:ring-[#38a63c]/15"
                    />
                </div>

                {showFilters && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {["total", "running", "idle", "stopped", "inactive", "nodata"].map((filter) => (
                            <button
                                key={filter}
                                type="button"
                                onClick={() => {
                                    setLocalStatusFilter(filter as typeof statusFilter)
                                    setCurrentPage(1)
                                }}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition-colors ${localStatusFilter === filter
                                    ? "border-[#38a63c]/30 bg-[#ecf8ea] text-[#2f8d35]"
                                    : "border-[#d6e3d0] bg-white text-slate-500 hover:text-[#2f8d35]"
                                    }`}
                            >
                                {filter === "total" ? "All" : filter}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-[minmax(140px,1.3fr)_minmax(96px,1fr)_40px_40px_40px_40px] border-b border-[#dbe7d4] bg-white px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                <div>Vehicle</div>
                <div>Driver</div>
                <div className="text-center">IGN</div>
                <div className="text-center">AC</div>
                <div className="text-center">PW</div>
                <div className="text-center">GPS</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-white">
                {paginatedVehicles.map((vehicle, index) => {
                    const isActive = selectedVehicle?.id === vehicle.id || selectedId === vehicle.id
                    return (
                        <button
                            key={vehicle.id || index}
                            type="button"
                            onClick={() => {
                                onSelect?.(vehicle.id)
                                dispatch(setReduxSelectedVehicle(vehicle.id))
                                setSelectedVehicle(vehicle)
                            }}
                            className={`grid w-full grid-cols-[minmax(140px,1.3fr)_minmax(96px,1fr)_40px_40px_40px_40px] items-center border-b border-[#edf3e8] px-4 py-3 text-left transition-colors ${isActive
                                ? "bg-[#eef8ec] shadow-[inset_3px_0_0_#38a63c]"
                                : "hover:bg-[#f7fbf5]"
                                }`}
                        >
                            <div className="min-w-0 pr-3">
                                <div className="flex items-center gap-2">
                                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusTone[vehicle.status]}`} />
                                    <span className="truncate text-sm font-bold uppercase text-slate-800">{vehicle.vehicleNumber || vehicle.id}</span>
                                </div>
                                <p className="mt-1 truncate text-xs text-slate-500">{vehicle.location || "Unknown location"}</p>
                            </div>

                            <div className="truncate pr-3 text-sm font-medium text-slate-600">
                                {vehicle.driver || "Unassigned"}
                            </div>

                            <div className="flex justify-center">
                                <Power className={`h-4 w-4 ${vehicle.ign ? "text-[#38a63c]" : "text-slate-300"}`} />
                            </div>
                            <div className="flex justify-center">
                                <Fan className={`h-4 w-4 ${vehicle.ac ? "text-[#38a63c]" : "text-slate-300"}`} />
                            </div>
                            <div className="flex justify-center">
                                <Zap className={`h-4 w-4 ${vehicle.pw ? "text-[#38a63c]" : "text-slate-300"}`} />
                            </div>
                            <div className="flex justify-center">
                                <Signal className={`h-4 w-4 ${vehicle.gps ? "text-[#38a63c]" : "text-slate-300"}`} />
                            </div>
                        </button>
                    )
                })}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[#dbe7d4] bg-[#f7fbf5] px-4 py-3">
                    <button
                        type="button"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                        className="rounded-lg border border-[#d6e3d0] bg-white px-3 py-1.5 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Prev
                    </button>
                    <div className="text-xs font-semibold text-slate-500">
                        Page {currentPage} of {totalPages}
                    </div>
                    <button
                        type="button"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                        className="rounded-lg border border-[#d6e3d0] bg-white px-3 py-1.5 text-xs font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}
