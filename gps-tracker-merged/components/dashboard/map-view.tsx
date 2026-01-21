"use client"

import { useEffect, useMemo, useRef } from "react"
import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api"
import { vehicles } from "@/lib/vehicles"
import type { VehiclePositions } from "@/lib/use-vehicle-positions"

const mapContainerStyle = {
  width: "100%",
  height: "100%",
}

const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#111827" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1d30" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
]

export function MapView({
  selectedVehicleId,
  positions,
}: {
  selectedVehicleId?: string | null
  positions: VehiclePositions
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
  })

  const mapRef = useRef<google.maps.Map | null>(null)

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId),
    [selectedVehicleId]
  )
  const visibleVehicles = useMemo(
    () => (selectedVehicle ? [selectedVehicle] : vehicles),
    [selectedVehicle]
  )

  useEffect(() => {
    if (!mapRef.current || !visibleVehicles.length) return
    const bounds = new google.maps.LatLngBounds()
    visibleVehicles.forEach((vehicle) => {
      const point = positions[vehicle.id] || vehicle.route[0]
      bounds.extend(point)
      if (selectedVehicle) {
        vehicle.route.forEach((routePoint) => bounds.extend(routePoint))
      }
    })
    mapRef.current.fitBounds(bounds, 60)
  }, [positions, visibleVehicles, selectedVehicle])

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
        Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to load Google Maps.
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
        Unable to load Google Maps. Check the API key and billing settings.
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
        Loading Google Maps...
      </div>
    )
  }

  const createCircleIcon = (color: string, scale: number) => ({
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#0f172a",
    strokeOpacity: 0.9,
    strokeWeight: 2,
    scale,
  })

  const statusColor = (status: string) => {
    if (status === "running") return "#34d399"
    if (status === "idle") return "#fbbf24"
    return "#ef4444"
  }

  return (
    <div className="relative h-full w-full bg-slate-950">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={12}
        center={visibleVehicles[0]?.route[0]}
        onLoad={(map) => {
          mapRef.current = map
        }}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        {visibleVehicles.map((vehicle) => {
          const point = positions[vehicle.id] || vehicle.route[0]
          return (
            <Marker
              key={vehicle.id}
              position={point}
              icon={createCircleIcon(statusColor(vehicle.status), selectedVehicle ? 9 : 7)}
            />
          )
        })}

        {selectedVehicle && (
          <>
            <Polyline
              path={selectedVehicle.route}
              options={{
                strokeColor: "#38bdf8",
                strokeOpacity: 0.9,
                strokeWeight: 4,
              }}
            />
            <Marker
              position={selectedVehicle.route[0]}
              icon={createCircleIcon("#22c55e", 6)}
              label={{ text: "S", color: "white", fontSize: "10px", fontWeight: "700" }}
            />
            <Marker
              position={selectedVehicle.route[selectedVehicle.route.length - 1]}
              icon={createCircleIcon("#0ea5e9", 6)}
              label={{ text: "E", color: "white", fontSize: "10px", fontWeight: "700" }}
            />
          </>
        )}
      </GoogleMap>

      <div className="absolute left-4 top-4 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-[10px] text-slate-200 shadow-lg">
        <div className="font-semibold tracking-wide text-slate-100">Vehicle Status</div>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Moving</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>Idle</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span>Stopped</span>
        </div>
      </div>
    </div>
  )
}
