"use client";

import { useEffect, useMemo, useRef } from "react";
import { DivIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Fuel, Gauge, Navigation, Thermometer } from "lucide-react";
import { TelemetryGrid } from "./telemetry-grid";
import { useDashboardContext } from "./DashboardContext";
import { useGetLiveVehicleByDeviceIdQuery } from "@/redux/api/gpsLiveApi";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

type LiveVehicleNode = {
  latitude?: number | string
  longitude?: number | string
  status?: string
}

function SmoothFocus({
  point,
  selectedId,
  focusKey,
}: {
  point: { lat: number; lng: number } | null;
  selectedId?: string | null;
  focusKey: number;
}) {
  const map = useMap();
  const lastIdRef = useRef<string | null>(null);
  const lastKeyRef = useRef<number>(0);
  const manualLockRef = useRef(false);
  const lockTimer = useRef<NodeJS.Timeout | null>(null);

  useMapEvents({
    dragstart() {
      manualLockRef.current = true;
      if (lockTimer.current) clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => {
        manualLockRef.current = false;
      }, 8000);
    },
    zoomstart() {
      manualLockRef.current = true;
      if (lockTimer.current) clearTimeout(lockTimer.current);
      lockTimer.current = setTimeout(() => {
        manualLockRef.current = false;
      }, 8000);
    },
  });

  useEffect(() => {
    if (!point) return;
    const isNewSelection = lastIdRef.current !== (selectedId || null);
    const isForced = focusKey !== lastKeyRef.current;
    const zoom = map.getZoom();
    const targetZoom = isNewSelection || isForced ? Math.max(zoom, 16) : zoom;
    if (!manualLockRef.current || isNewSelection || isForced) {
      map.flyTo(point, targetZoom, {
        duration: isNewSelection || isForced ? 0.6 : 0.35,
        easeLinearity: 0.3,
        noMoveStart: true,
      });
      lastIdRef.current = selectedId || null;
      lastKeyRef.current = focusKey;
    }
  }, [map, point, point?.lat, point?.lng, selectedId, focusKey]);

  return null;
}

const markerIcon = (color: string, size = 15) =>
  new DivIcon({
    className: "dashboard-vehicle-marker",
    html: `<div style="width:${size * 2.2}px;height:${size * 2.2}px;background:white;border:3px solid ${color};border-radius:9999px;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 24px rgba(0,0,0,0.18);"><div style="width:${size}px;height:${size}px;background:${color};border-radius:9999px;"></div></div>`,
    iconSize: [size * 2.2, size * 2.2],
    iconAnchor: [size * 1.1, size * 1.1],
  });

export function MapView() {
  const { selectedVehicle, focusKey } = useDashboardContext();
  const deviceId = selectedVehicle?.deviceId || selectedVehicle?.gpsDeviceId?._id || selectedVehicle?.gpsDeviceId;

  const { data: liveDataRes } = useGetLiveVehicleByDeviceIdQuery(deviceId, {
    skip: !deviceId,
    pollingInterval: 5000,
  });

  const liveNode = liveDataRes?.data as LiveVehicleNode | undefined;

  const currentPos = useMemo(() => {
    if (!liveNode) return null;
    const liveNodeWithAliases = liveNode as LiveVehicleNode & { lat?: number | string; lng?: number | string; lon?: number | string }
    const latRaw = liveNodeWithAliases.lat ?? liveNode.latitude;
    const lngRaw = liveNodeWithAliases.lng ?? liveNode.longitude ?? liveNodeWithAliases.lon;
    const lat = typeof latRaw === "string" ? parseFloat(latRaw) : latRaw;
    const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : lngRaw;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, status: liveNode.status || selectedVehicle?.status || "running" };
  }, [liveNode, selectedVehicle]);

  const statusColor = (status: string) => {
    if (status === "running") return "#38a63c";
    if (status === "idle") return "#f3a338";
    if (status === "inactive") return "#4da2e9";
    if (status === "nodata") return "#8b94a3";
    return "#ef5b4d";
  };

  if (!selectedVehicle) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f6fbf4] text-slate-500">
        <div className="rounded-2xl border border-dashed border-[#d6e3d0] bg-white px-6 py-8 text-center shadow-sm">
          <Navigation className="mx-auto mb-3 h-6 w-6 text-[#38a63c]" />
          <p className="text-sm font-semibold">Select a vehicle to view live tracking</p>
        </div>
      </div>
    );
  }

  const fallbackRoutePoint = selectedVehicle?.route?.[selectedVehicle?.route.length - 1] || selectedVehicle?.route?.[0] || null;
  const displayPoint = currentPos || fallbackRoutePoint;
  const center = displayPoint || { lat: 20.5937, lng: 78.9629 };
  const markerStatus = currentPos?.status || selectedVehicle?.status || "running";

  return (
    <div className="relative h-full w-full bg-[#f6fbf4]">
      <MapContainer center={center} zoom={13} className="h-full w-full" style={{ zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SmoothFocus point={displayPoint} selectedId={selectedVehicle?.id || selectedVehicle?._id || null} focusKey={focusKey} />

        {displayPoint && (
          <Marker
            position={displayPoint}
            icon={markerIcon(statusColor(markerStatus), 16)}
          >
            <Popup>
              <div className="min-w-[320px]">
                <div className="mb-3 rounded-2xl border border-[#dbe7d4] bg-[#f8fcf7] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected Vehicle</p>
                      <h4 className="mt-1 text-lg font-black text-slate-900">{selectedVehicle.vehicleNumber || "N/A"}</h4>
                      <p className="mt-1 text-sm font-medium text-slate-500">{selectedVehicle.driver || "Unassigned"}</p>
                    </div>
                    <span className="rounded-full bg-[#ecf8ea] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#2f8d35]">
                      {selectedVehicle.status || "N/A"}
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Speed
                        <Gauge className="h-3.5 w-3.5 text-[#38a63c]" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800">{selectedVehicle.speed || 0} km/h</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Fuel
                        <Fuel className="h-3.5 w-3.5 text-[#38a63c]" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800">{selectedVehicle.fuel != null ? `${selectedVehicle.fuel}%` : "N/A"}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                        Temp
                        <Thermometer className="h-3.5 w-3.5 text-[#38a63c]" />
                      </div>
                      <p className="mt-2 text-sm font-bold text-slate-800">{selectedVehicle.temperature || "N/A"}</p>
                    </div>
                  </div>
                </div>
                <TelemetryGrid vehicle={selectedVehicle} compact />
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      <div className="absolute left-4 top-4 rounded-2xl border border-[#d6e3d0] bg-white/95 px-4 py-3 text-[11px] text-slate-700 shadow-sm backdrop-blur">
        <div className="font-black uppercase tracking-[0.18em] text-[#2f8d35]">Vehicle Status</div>
        <div className="mt-3 space-y-2">
          {[
            ["Running", "#38a63c"],
            ["Idle", "#f3a338"],
            ["Stopped", "#ef5b4d"],
            ["Inactive", "#4da2e9"],
            ["No Data", "#8b94a3"],
          ].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="font-semibold">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedVehicle && (
        <div className="absolute bottom-4 left-4 right-4 rounded-[22px] border border-[#d6e3d0] bg-white/95 p-4 shadow-sm backdrop-blur md:max-w-md">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Selected Vehicle</p>
              <h3 className="mt-1 text-lg font-black text-slate-900">{selectedVehicle.vehicleNumber || "N/A"}</h3>
              <p className="mt-1 text-sm font-medium text-slate-500">{selectedVehicle.driver || "Unassigned"}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${selectedVehicle.status === "running"
              ? "bg-[#ecf8ea] text-[#2f8d35]"
              : selectedVehicle.status === "idle"
                ? "bg-amber-50 text-amber-700"
                : selectedVehicle.status === "inactive"
                  ? "bg-blue-50 text-blue-700"
                  : selectedVehicle.status === "nodata"
                    ? "bg-slate-100 text-slate-600"
                    : "bg-red-50 text-red-700"
              }`}>
              {selectedVehicle.status || "N/A"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-[#f8fcf7] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Speed</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{selectedVehicle.speed || 0} km/h</p>
            </div>
            <div className="rounded-2xl bg-[#f8fcf7] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Location</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedVehicle.location || "N/A"}</p>
            </div>
            <div className="rounded-2xl bg-[#f8fcf7] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Fuel</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{selectedVehicle.fuel != null ? `${selectedVehicle.fuel}%` : "N/A"}</p>
            </div>
            <div className="rounded-2xl bg-[#f8fcf7] p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">POI</p>
              <p className="mt-1 truncate text-sm font-bold text-slate-900">{selectedVehicle.poi || "N/A"}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
