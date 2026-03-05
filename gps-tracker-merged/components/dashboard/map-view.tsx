"use client";

import { useEffect, useMemo, useRef } from "react";
import { DivIcon } from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents, Popup } from "react-leaflet";
import { TelemetryGrid } from "./telemetry-grid";
import { useDashboardContext } from "./DashboardContext";
import { useGetLiveVehicleByDeviceIdQuery } from "@/redux/api/gpsLiveApi";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";

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
  }, [map, point?.lat, point?.lng, selectedId, focusKey]);

  return null;
}

const markerIcon = (color: string, size = 14) =>
  new DivIcon({
    className: "dashboard-vehicle-marker",
    html: `<div style="width:${size * 2}px;height:${size}px;background:${color};border:2px solid #0f172a;border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:11px;transform:rotate(0deg);">🚗</div>`,
    iconSize: [size * 2, size],
    iconAnchor: [size, size / 2],
  });

export function MapView() {
  const { selectedVehicle, focusKey } = useDashboardContext();
  const deviceId = selectedVehicle?.deviceId || selectedVehicle?.gpsDeviceId?._id || selectedVehicle?.gpsDeviceId;

  const { data: liveDataRes } = useGetLiveVehicleByDeviceIdQuery(deviceId, {
    skip: !deviceId,
    pollingInterval: 5000,
  });

  const liveNode = liveDataRes?.data;

  const currentPos = useMemo(() => {
    if (!liveNode) return null;
    const latRaw = (liveNode as any).lat ?? liveNode.latitude;
    const lngRaw = (liveNode as any).lng ?? liveNode.longitude ?? (liveNode as any).lon;
    const lat = typeof latRaw === "string" ? parseFloat(latRaw) : latRaw;
    const lng = typeof lngRaw === "string" ? parseFloat(lngRaw) : lngRaw;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, status: (liveNode as any).status || selectedVehicle?.status || "running" };
  }, [liveNode, selectedVehicle]);

  const pointsForBounds = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];
    if (currentPos) points.push(currentPos);
    if (selectedVehicle?.route) {
      selectedVehicle.route.forEach((routePoint: any) => points.push(routePoint));
    }
    return points;
  }, [currentPos, selectedVehicle]);

  const statusColor = (status: string) => {
    if (status === "running") return "#34d399";
    if (status === "idle") return "#fbbf24";
    if (status === "inactive") return "#22d3ee";
    if (status === "nodata") return "#64748b";
    return "#ef4444";
  };

  if (!selectedVehicle) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
        <span>Select vehicle to view tracking</span>
      </div>
    );
  }

  const fallbackRoutePoint = selectedVehicle?.route?.[selectedVehicle?.route.length - 1] || selectedVehicle?.route?.[0] || null;
  const displayPoint = currentPos || fallbackRoutePoint;
  const center = displayPoint || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="relative h-full w-full bg-slate-950">
      <MapContainer center={center} zoom={13} className="h-full w-full" style={{ zIndex: 1 }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SmoothFocus point={displayPoint} selectedId={selectedVehicle?.id || selectedVehicle?._id || null} focusKey={focusKey} />

        {displayPoint && (
          <Marker
            position={displayPoint}
            icon={
              markerIcon(statusColor((displayPoint as any).status || "running"), 18)
            }
          >
            <Popup className="dark-leaflet-popup">
              <div className="min-w-[300px] bg-slate-900 p-2">
                <TelemetryGrid vehicle={selectedVehicle} compact />
                <div className="mt-2 border-t border-white/5 pt-2 text-[8px] text-slate-500 italic">
                  Last update: {new Date().toLocaleTimeString()}
                </div>
              </div>
            </Popup>
          </Marker>
        )}

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
