"use client";

import { useMemo } from "react";
import { DivIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, Popup } from "react-leaflet";
import { TelemetryGrid } from "./telemetry-grid";
import type { Vehicle } from "@/lib/vehicles";
import type { VehiclePositions } from "@/lib/use-vehicle-positions";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  if (points.length) {
    map.fitBounds(latLngBounds(points.map((p) => [p.lat, p.lng])), {
      padding: [60, 60],
    });
  }
  return null;
}

const markerIcon = (color: string, size = 14) =>
  new DivIcon({
    className: "dashboard-vehicle-marker",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #0f172a;border-radius:9999px;box-shadow: 0 0 10px ${color}80;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

export function MapView({
  selectedVehicleId,
  positions,
  vehicles,
}: {
  selectedVehicleId?: string | null;
  positions: VehiclePositions;
  vehicles: Vehicle[];
}) {
  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === selectedVehicleId),
    [selectedVehicleId, vehicles],
  );
  const visibleVehicles = useMemo(
    () => (selectedVehicle ? [selectedVehicle] : vehicles),
    [selectedVehicle, vehicles],
  );

  const statusColor = (status: string) => {
    if (status === "running") return "#34d399";
    if (status === "idle") return "#fbbf24";
    if (status === "inactive") return "#22d3ee";
    if (status === "nodata") return "#64748b";
    return "#ef4444";
  };

  const pointsForBounds = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];
    visibleVehicles.forEach((vehicle) => {
      const point = positions[vehicle.id] || vehicle.route[0];
      if (point) points.push(point);
      if (selectedVehicle) {
        vehicle.route.forEach((routePoint) => points.push(routePoint));
      }
    });
    return points;
  }, [visibleVehicles, selectedVehicle, positions]);

  const center = visibleVehicles[0]?.route[0] || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="relative h-full w-full bg-slate-950">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={pointsForBounds} />

        {visibleVehicles.map((vehicle) => {
          const point = positions[vehicle.id] || vehicle.route[0];
          return (
            <Marker
              key={vehicle.id}
              position={point}
              icon={markerIcon(statusColor(vehicle.status), selectedVehicle ? 18 : 14)}
            >
              <Popup className="dark-leaflet-popup">
                <div className="min-w-[300px] bg-slate-900 p-2">
                  <TelemetryGrid vehicle={vehicle} compact />
                  <div className="mt-2 border-t border-white/5 pt-2 text-[8px] text-slate-500 italic">
                    Last update: {vehicle.date}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live dashboard map should show only current points.
            Route polylines are intentionally reserved for history views. */}
      </MapContainer>

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
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          <span>Inactive</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          <span>No Data</span>
        </div>
      </div>
    </div>
  );
}
