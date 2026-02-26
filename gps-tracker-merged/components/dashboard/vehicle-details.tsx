"use client";

import { Activity, Clock, Share2, Navigation, User, MapPin, ShieldAlert, Car, Truck, Fingerprint, Gauge, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Vehicle } from "@/lib/vehicles";
import type { VehiclePositions } from "@/lib/use-vehicle-positions";
import { TelemetryGrid } from "./telemetry-grid";

type DailyStats = {
    totalDistance?: number
    maxSpeed?: number
    avgSpeed?: number
    runningTime?: number
    idleTime?: number
    stoppedTime?: number
    inactiveTime?: number
}

type AlertItem = {
    _id?: string
    alertName?: string
    severity?: string
    gpsTimestamp?: string
}

export function VehicleDetails({
    vehicleId,
    positions,
    vehicles = [],
    selectedVehicleObj,
    dailyStats,
    alerts = [],
}: {
    vehicleId?: string | null;
    positions: VehiclePositions;
    vehicles?: Vehicle[];
    selectedVehicleObj?: Vehicle | null;
    dailyStats?: DailyStats | null;
    alerts?: AlertItem[];
}) {
    if (!vehicleId && !selectedVehicleObj) return null;
    const vehicle = selectedVehicleObj || vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return null;

    const recentAlert = alerts.length > 0 ? alerts[0] : null;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-slate-900/60 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
            {/* 1. Header: Primary Info & Status */}
            <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-6 py-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20 shadow-lg shadow-emerald-500/5">
                        <Activity size={24} className="text-emerald-400" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                           <h3 className="text-lg font-black text-slate-100 uppercase tracking-tighter">
                               {vehicle.vehicleNumber}
                           </h3>
                           <span className="text-[10px] font-black text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-full bg-emerald-400/5 tracking-widest uppercase">PRO</span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-tight">
                            <Clock size={12} className="text-slate-600" />
                            Update: <span className="text-slate-400">{vehicle.date}</span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest shadow-lg ${vehicle.status === 'running'
                        ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 shadow-emerald-500/5'
                        : vehicle.status === 'idle' 
                        ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 shadow-amber-500/5'
                        : 'bg-red-500/10 text-red-100 ring-1 ring-red-500/20 shadow-red-500/5'
                        }`}>
                        <span className={`h-2 w-2 rounded-full ${vehicle.status === 'running' ? 'bg-emerald-400 animate-pulse' : vehicle.status === 'idle' ? 'bg-amber-400 animate-pulse' : 'bg-red-500'}`} />
                        {vehicle.status}
                    </div>
                    <button className="rounded-xl bg-white/5 p-2.5 text-slate-400 transition-all hover:bg-emerald-500/10 hover:text-emerald-400 ring-1 ring-white/5">
                        <Share2 size={18} />
                    </button>
                </div>
            </div>

            {/* 2. Main Dashboard Content */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 custom-scrollbar">
                
                {/* Top Statistics Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Activity Stats Card */}
                    <div className="col-span-1 md:col-span-1 p-5 rounded-3xl bg-slate-800/40 border border-white/5 flex flex-col justify-between group transition-all hover:bg-slate-800/60">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daily Activity</span>
                           <Gauge size={16} className="text-emerald-400 opacity-50" />
                        </div>
                        <div className="space-y-4">
                           <div className="flex justify-between items-end border-b border-white/5 pb-3">
                              <span className="text-[11px] font-bold text-slate-400 uppercase">Avg Speed</span>
                              <span className="text-2xl font-black text-slate-100">{dailyStats?.avgSpeed || 0} <span className="text-xs text-slate-500">KM/H</span></span>
                           </div>
                           <div className="flex justify-between items-end">
                              <span className="text-[11px] font-bold text-slate-400 uppercase">Max Speed</span>
                              <span className="text-xl font-black text-amber-400">{dailyStats?.maxSpeed || 0} <span className="text-[10px] text-slate-600">KM/H</span></span>
                           </div>
                        </div>
                    </div>

                    {/* Today's Counters */}
                    <div className="col-span-1 md:col-span-1 p-5 rounded-3xl bg-slate-800/40 border border-white/5 transition-all hover:bg-slate-800/60">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Today's Duration (s)</div>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-emerald-400/80 uppercase">Running</span>
                              <span className="text-lg font-black text-slate-100">{dailyStats?.runningTime || 0}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-amber-400/80 uppercase">Idle</span>
                              <span className="text-lg font-black text-slate-100">{dailyStats?.idleTime || 0}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-red-400/80 uppercase">Stopped</span>
                              <span className="text-lg font-black text-slate-100">{dailyStats?.stoppedTime || 0}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-cyan-400/80 uppercase">Inact</span>
                              <span className="text-lg font-black text-slate-100">{dailyStats?.inactiveTime || 0}</span>
                           </div>
                        </div>
                    </div>

                    {/* Alerts Card */}
                    <div className="col-span-1 md:col-span-1 p-5 rounded-3xl bg-slate-800/40 border border-white/5 transition-all hover:bg-slate-800/60 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-4">
                           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Health</span>
                           {alerts.length === 0 ? <CheckCircle2 size={16} className="text-emerald-400" /> : <AlertTriangle size={16} className="text-amber-400" />}
                        </div>
                        <div className="space-y-2">
                           {recentAlert ? (
                               <>
                                 <div className="text-[10px] font-black text-amber-400/70 border border-amber-400/10 px-2 py-0.5 rounded bg-amber-400/5 w-fit uppercase mb-1">Recent Alert</div>
                                 <div className="text-xs font-bold text-slate-200 line-clamp-1">{recentAlert.alertName}</div>
                                 <div className="text-[10px] text-slate-500 font-medium">{new Date(recentAlert.gpsTimestamp || "").toLocaleTimeString()}</div>
                               </>
                           ) : (
                               <div className="flex flex-col gap-1 items-start py-2">
                                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Normal</div>
                                  <div className="text-[10px] text-slate-500 font-medium">All systems operational</div>
                               </div>
                           )}
                        </div>
                    </div>
                </div>

                {/* Live Telemetry Grid Section */}
                <div className="bg-slate-950/40 rounded-[32px] p-5 border border-white/5 ring-1 ring-white/5">
                    <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 text-center">Live Telemetry & Diagnostics</div>
                    <TelemetryGrid vehicle={vehicle} />
                </div>

                {/* Location & Specs Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Location Info */}
                    <div className="space-y-3">
                       <div className="flex items-center gap-2 mb-1">
                          <MapPin size={14} className="text-emerald-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Current Location & POI</span>
                       </div>
                       <div className="rounded-3xl bg-slate-800/30 p-4 border border-white/5 space-y-3">
                          <div>
                             <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Real-time Address</div>
                             <div className="text-xs font-bold text-slate-300 leading-relaxed uppercase">{vehicle.location}</div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                             <div>
                                <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Coordinates</div>
                                <div className="text-[11px] font-mono font-bold text-emerald-400/80">
                                   {positions[vehicle.id]?.lat.toFixed(6)}, {positions[vehicle.id]?.lng.toFixed(6)}
                                </div>
                             </div>
                             <div>
                                <div className="text-[9px] font-black text-slate-600 uppercase mb-1">Landmark / POI</div>
                                <div className="text-[11px] font-bold text-slate-300 uppercase truncate">
                                   {vehicle.poi || "No Landmark Near"}
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Vehicle Specs */}
                    <div className="space-y-3">
                       <div className="flex items-center gap-2 mb-1">
                          <Car size={14} className="text-emerald-400" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vehicle Specifications</span>
                       </div>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className="rounded-2xl bg-slate-800/30 p-3 border border-white/5 flex flex-col gap-1">
                             <div className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Make & Model</div>
                             <div className="text-xs font-black text-slate-100">{vehicle.make} {vehicle.model}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-800/30 p-3 border border-white/5 flex flex-col gap-1">
                             <div className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Year & Color</div>
                             <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                                {vehicle.year} 
                                <span className="h-3 w-3 rounded-full border border-white/20" style={{ backgroundColor: vehicle.color || 'white' }} />
                                <span className="capitalize">{vehicle.color}</span>
                             </div>
                          </div>
                          <div className="rounded-2xl bg-slate-800/30 p-3 border border-white/5 flex flex-col gap-1 col-span-2 sm:col-span-1">
                             <div className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">Compliance</div>
                             <div className="text-[11px] font-black text-emerald-400 uppercase tracking-tighter">
                                {vehicle.ais140Compliant ? "AIS-140 OK" : "Standard"}
                             </div>
                          </div>
                       </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
