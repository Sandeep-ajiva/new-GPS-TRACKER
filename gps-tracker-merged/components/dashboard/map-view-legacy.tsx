"use client";

import { useMemo, useEffect } from "react";

import { DivIcon, latLngBounds } from "leaflet";
import { MapContainer, Marker, useMap, Popup } from "react-leaflet";
import { MapTileLayer } from "../admin/Map/MapTileLayer";
import { TelemetryGrid } from "./telemetry-grid";
import { useDashboardContext } from "./DashboardContext";
import { useGetLiveVehicleByDeviceIdQuery } from "@/redux/api/gpsLiveApi";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import "../../styles/map.css"


function FitBounds({
  points,
}: {
  points: Array<{ lat: number; lng: number }>;
}) {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      map.fitBounds(latLngBounds(points.map((p) => [p.lat, p.lng])), {
        padding: [60, 60],
      });
    }
  }, [map, points]);
  return null;
}

const markerIcon = (color: string, size = 14) =>
  new DivIcon({
    className: "dashboard-vehicle-marker",
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid #0f172a;border-radius:9999px;box-shadow: 0 0 10px ${color}80;"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

export function MapView() {
  const { selectedVehicle } = useDashboardContext();
  const deviceId = selectedVehicle?.deviceId || selectedVehicle?.gpsDeviceId?._id || selectedVehicle?.gpsDeviceId;

  const { data: liveDataRes } = useGetLiveVehicleByDeviceIdQuery(deviceId, {
    skip: !deviceId,
    pollingInterval: 5000,
  });

  const liveNode = liveDataRes?.data as {
    latitude?: number
    longitude?: number
    status?: string
    poi?: string
    poiId?: string | null
  } | undefined;

  const currentPos = useMemo(() => {
    if (!liveNode || !Number.isFinite(liveNode.latitude) || !Number.isFinite(liveNode.longitude)) return null;
    return { lat: liveNode.latitude as number, lng: liveNode.longitude as number, status: liveNode.status || selectedVehicle?.status || "running" };
  }, [liveNode, selectedVehicle]);

  // Use freshest poi from 5s poll, fall back to context vehicle poi
  const livePoi = liveNode?.poi !== undefined
    ? (liveNode.poi || "-")
    : (selectedVehicle?.poi || "-");

  const pointsForBounds = useMemo(() => {
    const points: Array<{ lat: number; lng: number }> = [];
    if (currentPos) points.push(currentPos);
    if (selectedVehicle?.route) {
      selectedVehicle.route.forEach((routePoint: any) => points.push(routePoint));
    }
    return points;
  }, [currentPos, selectedVehicle]);
  if (!selectedVehicle) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-400">
        <span>Select vehicle to view tracking</span>
      </div>
    );
  }

  const statusColor = (status: string) => {
    if (status === "running") return "#34d399";
    if (status === "idle") return "#fbbf24";
    if (status === "inactive") return "#22d3ee";
    if (status === "nodata") return "#64748b";
    return "#ef4444";
  };

  const center = currentPos || selectedVehicle?.route?.[0] || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="relative h-full w-full bg-slate-950">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <MapTileLayer />
        <FitBounds points={pointsForBounds} />

        {currentPos && (
<Marker
  position={currentPos}
  icon={markerIcon(statusColor(currentPos.status), 18)}
>
  {/* Ensure you still have the custom-sleek-popup class to remove Leaflet's default white box */}
{/* Notice we added minWidth and maxWidth here! */}
<Popup className="custom-sleek-popup" minWidth={340} maxWidth={340}>
  
  <div className="w-[340px] bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden font-sans">
    
    {/* --- TOP: Registration & Status --- */}
    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100">
      <div>
        <h3 className="text-base font-bold text-slate-800 leading-tight">
          {selectedVehicle?.registrationNumber || "DL20E4750"}
        </h3>
        <div className="flex items-center gap-1.5 mt-1 text-slate-500 text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          {selectedVehicle?.driver || "Ram Dev"}
        </div>
      </div>
      
      <div className="px-2.5 py-1 bg-red-50 border border-red-100 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
        {selectedVehicle?.status || "Stopped"}
      </div>
    </div>

    {/* --- MIDDLE: Quick Vitals --- */}
    <div className="flex justify-between items-center px-4 py-2.5 bg-slate-50/50">
      
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          Speed
        </div>
        <span className="text-slate-800 text-sm font-semibold">0 <span className="text-[10px] text-slate-500 font-normal">km/h</span></span>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
          Ignition
        </div>
        <span className="text-slate-800 text-sm font-semibold">Off</span>
      </div>

      <div className="flex flex-col items-center">
        <div className="flex items-center gap-1 text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-0.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
          GPS
        </div>
        <span className="text-green-600 text-sm font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          Live
        </span>
      </div>

    </div>

    {/* --- BOTTOM: Single Line Location --- */}
    <div className="px-4 py-2.5 border-t border-slate-100 flex items-center gap-2 bg-white">
      <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
      <p className="text-xs text-slate-600 font-medium truncate w-full" title={livePoi}>
        {livePoi || "NH5, Kharar, Kharar Tahsil, Punjab"}
      </p>
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
      </div>
    </div>
  );
}
