import { MapPin, Navigation, Share2, User } from "lucide-react"
import { vehicles } from "@/lib/vehicles"
import type { VehiclePositions } from "@/lib/use-vehicle-positions"

export function VehicleDetails({
    vehicleId,
    positions,
}: {
    vehicleId?: string | null
    positions: VehiclePositions
}) {
    if (!vehicleId) return null
    const vehicle = vehicles.find((item) => item.id === vehicleId)
    if (!vehicle) return null

    const startPoint = vehicle.route[0]
    const endPoint = vehicle.route[vehicle.route.length - 1]
    const currentPoint = positions[vehicle.id] || endPoint
    const statusLabel =
        vehicle.status === "running" ? "Running" : vehicle.status === "idle" ? "Idle" : "Stopped"

    return (
        <div className="grid h-full grid-cols-1 gap-2 overflow-hidden md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded border border-white/10 bg-slate-900/70 p-3 text-slate-100">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-emerald-400/20" />
                    <div>
                        <div className="text-sm font-semibold text-slate-100">{vehicle.driver}</div>
                        <div className="text-xs text-slate-400">Driver</div>
                    </div>
                </div>
                <div className="mt-3 text-xs text-slate-300">
                    <div className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        <span>{vehicle.location}</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded bg-slate-800">
                        <div className="h-full w-1/2 bg-emerald-400" />
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">50%</div>
                </div>
            </div>

            <div className="rounded border border-white/10 bg-slate-900/70 p-3 text-slate-100">
                <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-100">Current Trip</div>
                    <div className="rounded bg-emerald-400/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">{statusLabel}</div>
                </div>
                <div className="mt-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                        <Navigation className="h-3.5 w-3.5 text-slate-400" />
                        <span>{vehicle.speed} km/h</span>
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">{vehicle.date}</div>
                </div>
                <button className="mt-3 flex w-full items-center justify-center gap-1 rounded bg-emerald-400 py-1 text-[10px] font-semibold text-slate-900 hover:bg-emerald-300">
                    <Share2 className="h-3 w-3" /> Share Location
                </button>
            </div>

            <div className="rounded border border-white/10 bg-slate-900/70 p-3 text-slate-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    Route Snapshot
                </div>
                <div className="mt-2 text-xs text-slate-300">
                    Start: {startPoint.lat}, {startPoint.lng}
                    <div className="mt-1 text-[10px] text-slate-400">
                        Current: {currentPoint.lat}, {currentPoint.lng}
                    </div>
                    <div className="mt-1 text-[10px] text-slate-400">End: {endPoint.lat}, {endPoint.lng}</div>
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="rounded border border-white/10 px-2 py-0.5">Add Geofence</span>
                    <span className="rounded border border-white/10 px-2 py-0.5">Add Address</span>
                </div>
            </div>

            <div className="rounded border border-white/10 bg-slate-900/70 p-3 text-slate-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                    <User className="h-4 w-4 text-slate-400" />
                    Nearby POI
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[10px] text-slate-300">
                    <div className="rounded border border-white/10 px-2 py-1">
                        <div className="font-semibold text-slate-100">Gas</div>
                        <div className="text-[9px] text-slate-400">5 km</div>
                    </div>
                    <div className="rounded border border-white/10 px-2 py-1">
                        <div className="font-semibold text-slate-100">Food</div>
                        <div className="text-[9px] text-slate-400">1 km</div>
                    </div>
                    <div className="rounded border border-white/10 px-2 py-1">
                        <div className="font-semibold text-slate-100">Zoo</div>
                        <div className="text-[9px] text-slate-400">3 km</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
