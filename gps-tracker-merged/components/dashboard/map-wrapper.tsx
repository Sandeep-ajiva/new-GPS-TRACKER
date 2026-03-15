"use client"

import dynamic from "next/dynamic"
import { Loader2 } from "lucide-react"

// Dynamically import Map with no SSR
const Map = dynamic(() => import("./map-view").then((mod) => mod.MapView), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center bg-[#f6fbf4] text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#2f8d35]" />
            <span className="ml-2 font-semibold">Loading Map...</span>
        </div>
    ),
})

export function MapWrapper() {
    return <Map />
}
