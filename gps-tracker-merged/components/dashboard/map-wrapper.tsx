"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"
import type { VehiclePositions } from "@/lib/use-vehicle-positions"

// Dynamically import Map with no SSR
const Map = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading Map...</span>
        </div>
    ),
})

export function MapWrapper({
    selectedVehicleId,
    positions,
}: {
    selectedVehicleId?: string | null
    positions: VehiclePositions
}) {
    return <Map selectedVehicleId={selectedVehicleId} positions={positions} />
}
