"use client";

import { useMemo, useState } from "react";
import { Loader2, AlertTriangle, Calendar, Car, Filter, TrendingUp, Clock3, Zap, Activity, Gauge, AlertOctagon, ShieldOff, History } from "lucide-react";
import { toast } from "sonner";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import {
  useGetVehicleDailyStatsQuery,
  useGetVehicleDailyStatsByVehicleQuery,
  useGetVehicleDailyStatsByDateQuery,
} from "@/redux/api/vehicleDailyStatsApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";
import dynamic from "next/dynamic";

const DailyRouteMap = dynamic(() => import("@/components/admin/Map/DailyRouteMap"), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full animate-pulse rounded-2xl bg-slate-900/40" />
});

type DailyStat = {
  vehicleId?: { vehicleNumber?: string; _id?: string } | string;
  date?: string;
  totalDistance?: number;
  runningTime?: number;
  idleTime?: number;
  stoppedTime?: number;
  maxSpeed?: number;
  avgSpeed?: number;
  totalTrips?: number;
  ignitionOnCount?: number;
  overspeedCount?: number;
  harshBrakingCount?: number;
  emergencyCount?: number;
  lastCalculatedAt?: string;
};

const todayInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const formatSeconds = (sec?: number) => {
  const s = Math.max(0, Math.floor(sec || 0));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
};

const toKm = (val?: number) => (Number(val || 0)).toFixed(2);
const toRad = (v: number) => (v * Math.PI) / 180;
const haversine = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

function SummaryCard({ label, value, icon: Icon, accent }: { label: string; value: string; icon: any; accent: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${accent}`}>
          <Icon size={18} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="text-xl font-bold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function DailyStatusPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(todayInput());
  const [appliedVehicleId, setAppliedVehicleId] = useState<string>("");
  const [appliedDate, setAppliedDate] = useState<string>(todayInput());

  const { data: vehiclesRes, isLoading: loadingVehicles } = useGetVehiclesQuery(undefined);
  const vehicles = useMemo(() => vehiclesRes?.vehicles || vehiclesRes?.data || [], [vehiclesRes]);

  // Queries
  const statsByVehicleDate = useGetVehicleDailyStatsByDateQuery(
    { vehicleId: appliedVehicleId, date: appliedDate },
    { skip: !appliedVehicleId || !appliedDate },
  );

  const loading = loadingVehicles || statsByVehicleDate.isLoading;
  const error = statsByVehicleDate.error;

  const rawData: any = statsByVehicleDate.data;

  const rows: DailyStat[] = useMemo(() => {
    const list = rawData?.data || rawData?.stats || rawData || [];
    if (Array.isArray(list)) return list;
    if (list) return [list];
    return [];
  }, [rawData]);

  // History for selected day (single vehicle only)
  // Use local-day window (no Z) so packets sent in local time are included
  const dayStart = useMemo(() => `${appliedDate}T00:00:00`, [appliedDate]);
  const dayEnd = useMemo(() => `${appliedDate}T23:59:59`, [appliedDate]);
  const { data: dayHistory, isLoading: historyLoading } = useGetVehicleHistoryQuery(
    {
      vehicleId: appliedVehicleId,
      from: dayStart,
      to: dayEnd,
      page: 0,
      limit: 20000,
    },
    { skip: !appliedVehicleId || !appliedDate }
  );

  const routePoints = useMemo(() => {
    const list = dayHistory?.data || [];
    return list
      .map((p: any) => {
        const timestamp = p.gpsTimestamp || p.receivedAt;
        if (!timestamp || !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude)) return null;
        return {
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          timestamp,
          speed: Number(p.speed || 0),
          ignition: Boolean(p.ignitionStatus ?? p.ignition ?? true),
          heading: Number(p.heading || p.course || 0),
          alertType: p.alertType || p.alertIdentifier || p.event,
        };
      })
      .filter(Boolean);
  }, [dayHistory]);

  const routeStats = useMemo(() => {
    if (routePoints.length < 2) return null;
    let distance = 0;
    let driving = 0;
    let idling = 0;
    let stoppage = 0;
    let speedSum = 0;
    let speedCount = 0;

    for (let i = 1; i < routePoints.length; i++) {
      const a = routePoints[i - 1];
      const b = routePoints[i];
      const deltaT = Math.max(0, (new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) / 1000);
      distance += haversine(a, b);
      speedSum += b.speed;
      speedCount += 1;
      if (b.speed > 2) driving += deltaT;
      else if (b.speed === 0 && b.ignition) idling += deltaT;
      else if (b.speed === 0) stoppage += deltaT;
    }
    const currentDistance = haversine(routePoints[0], routePoints[routePoints.length - 1]) / 1000;
    return {
      travelled: distance / 1000,
      currentDistance,
      avgSpeed: speedCount ? speedSum / speedCount : 0,
      driving,
      idling,
      stoppage,
    };
  }, [routePoints]);

  const routeEvents = useMemo(() => {
    const ev: any[] = [];
    let streak: any[] = [];
    for (let i = 1; i < routePoints.length; i++) {
      const prev = routePoints[i - 1];
      const cur = routePoints[i];
      if (prev.heading != null && cur.heading != null) {
        let delta = cur.heading - prev.heading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const abs = Math.abs(delta);
        if (abs >= 15) {
          const label = abs > 60 ? (delta > 0 ? "sharp right" : "sharp left") : delta > 0 ? "slight right" : "slight left";
          ev.push({ type: "turn", label, timestamp: cur.timestamp });
        }
      }
      if (prev.speed - cur.speed > 30) ev.push({ type: "harsh", label: "harsh brake", timestamp: cur.timestamp });
      if (cur.speed === 0) streak.push(cur);
      else {
        if (streak.length > 2) ev.push({ type: streak[0].ignition ? "idle" : "stop", label: streak[0].ignition ? "idle" : "stop", timestamp: streak[streak.length - 1].timestamp });
        streak = [];
      }
    }
    if (streak.length > 2) ev.push({ type: streak[0].ignition ? "idle" : "stop", label: streak[0].ignition ? "idle" : "stop", timestamp: streak[streak.length - 1].timestamp });
    return {
      turns: ev.filter((e) => e.type === "turn").length,
      stops: ev.filter((e) => e.type === "stop").length,
      idle: ev.filter((e) => e.type === "idle").length,
      harsh: ev.filter((e) => e.type === "harsh").length,
    };
  }, [routePoints]);

  const summaryMetrics = useMemo(() => {
    const base = rows[0];
    const hasHistory = routePoints.length > 0;
    const historyAvgSpeed = hasHistory ? routePoints.reduce((acc: number, p: any) => acc + (p.speed || 0), 0) / routePoints.length : 0;
    const firstPoint = hasHistory ? routePoints[0] : null;
    const lastPoint = hasHistory ? routePoints[routePoints.length - 1] : null;
    const directDistance = firstPoint && lastPoint
      ? haversine({ lat: firstPoint.lat, lng: firstPoint.lng }, { lat: lastPoint.lat, lng: lastPoint.lng }) / 1000
      : 0;

    return {
      travelledDistance: Number(base?.totalDistance ?? routeStats?.travelled ?? (hasHistory ? routeStats?.travelled ?? 0 : 0)),
      currentDistance: Number(base?.currentDistance ?? routeStats?.currentDistance ?? directDistance),
      averageSpeed: Number(base?.avgSpeed ?? routeStats?.avgSpeed ?? historyAvgSpeed),
      drivingDuration: Number(base?.runningTime ?? routeStats?.driving ?? 0),
      idleDuration: Number(base?.idleTime ?? routeStats?.idling ?? 0),
      stoppageDuration: Number(base?.stoppedTime ?? routeStats?.stoppage ?? 0),
      turns: Number((base as any)?.turns ?? routeEvents.turns ?? 0),
      stops: Number((base as any)?.stops ?? routeEvents.stops ?? 0),
      harshBrakes: Number(base?.harshBrakingCount ?? routeEvents.harsh ?? 0),
    };
  }, [rows, routeStats, routeEvents, routePoints]);

  const handleApply = () => {
    if (!selectedVehicleId) {
      toast.error("Please select a vehicle first");
      return;
    }
    setAppliedVehicleId(selectedVehicleId);
    setAppliedDate(selectedDate);
  };

  return (
    <div className="p-6 space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Vehicle Daily Status</h1>
          <p className="text-sm text-slate-400">View per-vehicle daily rollups with distance, runtime and alerts.</p>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Calendar size={14} />
          <span>{formatDate(appliedDate)}</span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur p-4 shadow-lg shadow-black/20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="flex flex-col gap-1 text-sm text-slate-300">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white outline-none focus:border-emerald-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-slate-300">
            <span className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Vehicle</span>
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-white outline-none focus:border-emerald-400"
            >
              <option value="">Select vehicle...</option>
              {vehicles.map((v: any) => (
                <option key={v._id} value={v._id}>
                  {v.vehicleNumber || v.registrationNumber || v._id}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
            >
              <Filter size={16} />
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {!appliedVehicleId ? (
        <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 py-10 text-slate-400">
          Select a vehicle and apply filters to view daily status.
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-slate-300">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading daily status...
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          <AlertTriangle size={16} />
          Failed to load daily status. Please try again.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <SummaryCard label="Travelled Distance" value={`${summaryMetrics.travelledDistance.toFixed(2)} km`} icon={TrendingUp} accent="bg-emerald-500/15 text-emerald-300" />
            <SummaryCard label="Current Distance" value={`${summaryMetrics.currentDistance.toFixed(2)} km`} icon={Gauge} accent="bg-sky-500/15 text-sky-200" />
            <SummaryCard label="Average Speed" value={`${summaryMetrics.averageSpeed.toFixed(1)} km/h`} icon={Clock3} accent="bg-purple-500/15 text-purple-200" />
            <SummaryCard label="Driving Duration" value={formatSeconds(summaryMetrics.drivingDuration)} icon={Activity} accent="bg-emerald-500/15 text-emerald-300" />
            <SummaryCard label="Idle Duration" value={formatSeconds(summaryMetrics.idleDuration)} icon={ShieldOff} accent="bg-amber-500/15 text-amber-200" />
            <SummaryCard label="Stoppage Duration" value={formatSeconds(summaryMetrics.stoppageDuration)} icon={AlertOctagon} accent="bg-rose-500/15 text-rose-200" />
            <SummaryCard label="Turns" value={`${summaryMetrics.turns}`} icon={History} accent="bg-blue-500/15 text-blue-200" />
            <SummaryCard label="Stops" value={`${summaryMetrics.stops}`} icon={History} accent="bg-slate-500/15 text-slate-200" />
            <SummaryCard label="Harsh Brakes" value={`${summaryMetrics.harshBrakes}`} icon={History} accent="bg-red-500/15 text-red-200" />
          </div>

          {appliedVehicleId && (
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 shadow-lg shadow-black/25 p-3">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">Route Map ({formatDate(appliedDate)})</div>
                <div className="text-xs text-slate-400">
                  {historyLoading ? "Loading route..." : `${routePoints.length} points`}
                </div>
              </div>
              {historyLoading ? (
                <div className="flex h-[500px] items-center justify-center text-slate-300">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading route...
                </div>
              ) : routePoints.length === 0 ? (
                <div className="flex h-[500px] items-center justify-center text-slate-400">
                  No route data for this day.
                </div>
              ) : (
                <DailyRouteMap points={routePoints as any} />
              )}
            </div>
          )}

          {appliedVehicleId && routeStats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <SummaryCard label="Travelled Distance" value={`${routeStats.travelled.toFixed(2)} km`} icon={TrendingUp} accent="bg-emerald-500/15 text-emerald-300" />
              <SummaryCard label="Current Distance" value={`${routeStats.currentDistance.toFixed(2)} km`} icon={Gauge} accent="bg-sky-500/15 text-sky-200" />
              <SummaryCard label="Average Speed" value={`${routeStats.avgSpeed.toFixed(1)} km/h`} icon={Clock3} accent="bg-purple-500/15 text-purple-200" />
              <SummaryCard label="Driving Duration" value={formatSeconds(routeStats.driving)} icon={Activity} accent="bg-emerald-500/15 text-emerald-300" />
              <SummaryCard label="Idling Duration" value={formatSeconds(routeStats.idling)} icon={ShieldOff} accent="bg-amber-500/15 text-amber-200" />
              <SummaryCard label="Stoppage Duration" value={formatSeconds(routeStats.stoppage)} icon={AlertOctagon} accent="bg-rose-500/15 text-rose-200" />
              <SummaryCard label="Turns" value={`${routeEvents.turns}`} icon={History} accent="bg-blue-500/15 text-blue-200" />
              <SummaryCard label="Stops" value={`${routeEvents.stops}`} icon={History} accent="bg-slate-500/15 text-slate-200" />
              <SummaryCard label="Harsh Brakes" value={`${routeEvents.harsh}`} icon={History} accent="bg-red-500/15 text-red-200" />
            </div>
          )}

          {appliedVehicleId && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg shadow-black/25 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
              <div className="flex items-center gap-2">
                <History size={16} />
                Daily Breakdown
              </div>
              <span className="text-xs text-slate-400">Showing {rows.length} record(s)</span>
            </div>
            {rows.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-400">No Daily Data Found</div>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-sm text-slate-200">
                  <thead className="bg-slate-800/70 text-[12px] uppercase tracking-[0.18em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 text-left">Vehicle</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-right">Total Distance</th>
                      <th className="px-4 py-3 text-right">Running Time</th>
                      <th className="px-4 py-3 text-right">Idle Time</th>
                      <th className="px-4 py-3 text-right">Stopped Time</th>
                      <th className="px-4 py-3 text-right">Max Speed</th>
                      <th className="px-4 py-3 text-right">Avg Speed</th>
                      <th className="px-4 py-3 text-right">Total Trips</th>
                      <th className="px-4 py-3 text-right">Ign On</th>
                      <th className="px-4 py-3 text-right">Overspeed</th>
                      <th className="px-4 py-3 text-right">Harsh Braking</th>
                      <th className="px-4 py-3 text-right">Emergency</th>
                      <th className="px-4 py-3 text-left">Last Calculated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => {
                      const vehicleLabel =
                        typeof row.vehicleId === "string"
                          ? row.vehicleId
                          : row.vehicleId?.vehicleNumber || row.vehicleId?._id || "Vehicle";
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? "bg-slate-900/40" : "bg-slate-900/20"}>
                          <td className="px-4 py-3">{vehicleLabel}</td>
                          <td className="px-4 py-3">{formatDate(row.date)}</td>
                          <td className="px-4 py-3 text-right">{toKm(row.totalDistance)} km</td>
                          <td className="px-4 py-3 text-right">{formatSeconds(row.runningTime)}</td>
                          <td className="px-4 py-3 text-right">{formatSeconds(row.idleTime)}</td>
                          <td className="px-4 py-3 text-right">{formatSeconds(row.stoppedTime)}</td>
                          <td className="px-4 py-3 text-right">{(Number(row.maxSpeed || 0)).toFixed(1)} km/h</td>
                          <td className="px-4 py-3 text-right">{(Number(row.avgSpeed || 0)).toFixed(1)} km/h</td>
                          <td className="px-4 py-3 text-right">{row.totalTrips ?? 0}</td>
                          <td className="px-4 py-3 text-right">{row.ignitionOnCount ?? 0}</td>
                          <td className="px-4 py-3 text-right">{row.overspeedCount ?? 0}</td>
                          <td className="px-4 py-3 text-right">{row.harshBrakingCount ?? 0}</td>
                          <td className="px-4 py-3 text-right">{row.emergencyCount ?? 0}</td>
                          <td className="px-4 py-3 text-left text-slate-400">{formatDate(row.lastCalculatedAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}
        </>
      )}
    </div>
  );
}
