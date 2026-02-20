"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Loader2 } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

const LiveMap = dynamic(() => import("@/components/admin/Map/LeafletLiveMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-120px)] w-full animate-pulse rounded-2xl bg-slate-100" />
  ),
});

interface Vehicle {
  id: string;
  vehicleNumber: string;
  lat: number;
  lng: number;
  speed: number;
  heading?: number;
  status: string;
  lastUpdated: string;
  organizationId?: string;
}

interface ApiGpsItem {
  _id: string;
  vehicleId?: {
    _id: string;
    vehicleNumber: string;
  };
  organizationId?: string | { _id: string };
  latitude?: number;
  longitude?: number;
  currentSpeed?: number;
  heading?: number;
  movementStatus?: string;
  updatedAt?: string;
}

export default function LiveTrackingPage() {
  const { data: liveDataRes, isLoading } = useGetLiveVehiclesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: false,
    refetchOnReconnect: true,
  });

  const [vehiclesMap, setVehiclesMap] = useState<Record<string, Vehicle>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  // Update current time every minute for "online" calculation
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Handle real-time updates
  const handleGpsUpdate = useCallback(
    (update: {
      vehicleId: string;
      latitude?: number;
      lat?: number;
      longitude?: number;
      lng?: number;
      speed?: number;
      movementStatus?: string;
      status?: string;
      updatedAt?: string;
      lastUpdated?: string;
    }) => {
      setVehiclesMap((prev) => {
        const existing = prev[update.vehicleId];
        if (!existing) return prev;

        return {
          ...prev,
          [update.vehicleId]: {
            ...existing,
            lat: update.lat ?? update.latitude ?? existing.lat,
            lng: update.lng ?? update.longitude ?? existing.lng,
            speed: update.speed ?? existing.speed,
            status: update.status ?? update.movementStatus ?? existing.status,
            lastUpdated:
              update.lastUpdated ??
              update.updatedAt ??
              new Date().toISOString(),
          },
        };
      });
    },
    [],
  );

  const { isConnected, socket } = useSocket("gps_update", handleGpsUpdate);

  // Handle socket rooms subscription
  useEffect(() => {
    if (liveDataRes?.data && socket) {
      const orgIds = new Set<string>();
      liveDataRes.data.forEach((item: ApiGpsItem) => {
        const orgId =
          typeof item.organizationId === "string"
            ? item.organizationId
            : item.organizationId?._id;
        if (orgId) orgIds.add(orgId);
      });

      orgIds.forEach((id) => {
        socket.emit("join_organization", id);
        console.log(`📡 Joined socket room: org_${id}`);
      });

      return () => {
        orgIds.forEach((id) => {
          socket.emit("leave_organization", id);
        });
      };
    }
  }, [liveDataRes?.data, socket]);

  // Initialize/Sync vehicles from API data
  useEffect(() => {
    if (liveDataRes?.data) {
      setVehiclesMap((prev) => {
        let changed = false;
        const nextMap = { ...prev };
        liveDataRes.data.forEach((item: ApiGpsItem) => {
          const id = item.vehicleId?._id || item._id;
          const orgId =
            typeof item.organizationId === "string"
              ? item.organizationId
              : item.organizationId?._id;

          if (!nextMap[id]) {
            nextMap[id] = {
              id,
              vehicleNumber: item.vehicleId?.vehicleNumber || "Unknown",
              lat: item.latitude || 0,
              lng: item.longitude || 0,
              speed: item.currentSpeed || 0,
              heading: item.heading || 0,
              status: item.movementStatus || "offline",
              lastUpdated: item.updatedAt || new Date().toISOString(),
              organizationId: orgId,
            };
            changed = true;
          }
        });
        return changed ? nextMap : prev;
      });
    }
  }, [liveDataRes]);

  const vehicles = useMemo(() => Object.values(vehiclesMap), [vehiclesMap]);

  const onlineCount = useMemo(() => {
    return vehicles.filter((v) => {
      const diff = currentTime - new Date(v.lastUpdated).getTime();
      return diff < 5 * 60 * 1000;
    }).length;
  }, [vehicles, currentTime]);

  if (isLoading && vehicles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-slate-500" size={32} />
      </div>
    );
  }

  return (
    <ApiErrorBoundary hasError={false}>
      <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
              Live Ops
            </p>
            <h1 className="text-2xl font-black text-slate-900">
              Live Tracking
            </h1>
            <p className="text-sm text-slate-500">
              Real-time GPS tracking of your fleet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700">
              Online Vehicles:{" "}
              <span className="text-emerald-600">{onlineCount}</span> /{" "}
              {vehicles.length}
            </div>
            <div
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${
                isConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`}
              ></span>
              {isConnected ? "Live Updates Active" : "Connecting..."}
            </div>
          </div>
        </div>

        <div className="relative flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <LiveMap vehicles={vehicles} />
        </div>
      </div>
    </ApiErrorBoundary>
  );
}
