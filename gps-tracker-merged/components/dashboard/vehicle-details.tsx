"use client";

import { Activity, Clock, Share2, Navigation, User, MapPin, ShieldAlert } from "lucide-react";
import type { Vehicle } from "@/lib/vehicles";
import type { VehiclePositions } from "@/lib/use-vehicle-positions";
import { TelemetryGrid } from "./telemetry-grid";

export function VehicleDetails({
    vehicleId,
    positions,
    vehicles = [],
}: {
    vehicleId?: string | null;
    positions: VehiclePositions;
    vehicles?: Vehicle[];
}) {
    if (!vehicleId) return null;
    const vehicle = vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return null;

    return (
        <div className="flex h-full flex-col overflow-hidden bg-slate-900/40 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-md">
            {/* Header Info */}
            <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/50 px-4 py-2.5 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="rounded-full bg-emerald-500/10 p-1.5 ring-1 ring-emerald-500/20">
                        <Activity size={14} className="text-emerald-400" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-100 flex items-center gap-2">
                            {vehicle.vehicleNumber}
                            <span className="text-[10px] font-bold text-emerald-400/70 border border-emerald-400/20 px-1.5 rounded bg-emerald-400/5">PRO</span>
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <Clock size={10} />
                            Update: {vehicle.date}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button className="rounded-lg bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-emerald-400">
                        <Share2 size={14} />
                    </button>
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-tight ${vehicle.status === 'running'
                            ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20'
                        }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${vehicle.status === 'running' ? 'bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]' : 'bg-red-500'}`} />
                        {vehicle.status}
                    </div>
                </div>
            </div>

            {/* Main Telemetry Grid */}
            <div className="flex-1 overflow-auto p-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                <TelemetryGrid vehicle={vehicle} />

                {/* Secondary Info Rows */}
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5 flex items-center gap-3 transition-colors hover:bg-slate-800/60">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/10">
                            <Navigation size={14} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Coordinates</div>
                            <div className="text-[10px] font-bold text-slate-300 truncate">
                                {positions[vehicle.id]?.lat.toFixed(4)}, {positions[vehicle.id]?.lng.toFixed(4)}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5 flex items-center gap-3 transition-colors hover:bg-slate-800/60">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/10">
                            <ShieldAlert size={14} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Signal Strenth</div>
                            <div className="text-[10px] font-bold text-slate-300">
                                {vehicle.gsmSignal ? `${vehicle.gsmSignal}% Excellent` : "Searching..."}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-slate-800/40 p-2.5 flex items-center gap-3 transition-colors hover:bg-slate-800/60">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/10">
                            <MapPin size={14} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">Satellites</div>
                            <div className="text-[10px] font-bold text-slate-300">
                                {vehicle.satelliteCount ?? 0} Fixed
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
