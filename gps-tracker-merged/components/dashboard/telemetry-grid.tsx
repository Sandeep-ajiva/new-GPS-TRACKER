"use client";

import { Power, Fan, Zap, Signal, Info, Navigation, User, MapPin, Activity } from "lucide-react";
import type { Vehicle } from "@/lib/vehicles";

export function TelemetryGrid({ vehicle, compact = false }: { vehicle: Vehicle; compact?: boolean }) {
    const fields = [
        { label: "IGN", value: vehicle.ign, icon: Power },
        { label: "AC", value: vehicle.ac, icon: Fan },
        { label: "PW", value: vehicle.pw, icon: Zap },
        { label: "GPS", value: vehicle.gps, icon: Signal },
    ];

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className={`grid gap-2 ${compact ? "grid-cols-4 md:grid-cols-8" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-8"}`}>
                {/* 1. Vehicle */}
                <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-2 border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vehicle</span>
                    <div className="flex items-center gap-2 truncate font-bold text-slate-100">
                        <Navigation size={12} className="text-emerald-400 rotate-45" />
                        <span className="truncate">{vehicle.vehicleNumber || vehicle.id}</span>
                    </div>
                </div>

                {/* 2. Driver */}
                <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-2 border border-white/5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Driver</span>
                    <div className="flex items-center gap-2 truncate font-bold text-slate-100 italic">
                        <User size={12} className="text-emerald-400" />
                        <span className="truncate">{vehicle.driver}</span>
                    </div>
                </div>

                {/* 3-6. IGN, AC, PW, GPS */}
                {fields.map((field) => (
                    <div key={field.label} className="flex flex-col gap-1 rounded-xl bg-white/5 p-2 border border-white/5 items-center justify-center">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{field.label}</span>
                        <field.icon className={`h-4 w-4 ${field.value ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" : "text-red-500/40"}`} />
                    </div>
                ))}

                {/* 7. Speed */}
                <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-2 border border-white/5 items-center justify-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Speed</span>
                    <div className="text-sm font-black text-emerald-400">
                        {vehicle.speed} <span className="text-[8px] opacity-70">KM/H</span>
                    </div>
                </div>

                {/* 8. Info/Action */}
                <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-2 border border-white/5 items-center justify-center">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Info</span>
                    <Info size={16} className="text-emerald-400/50" />
                </div>
            </div>

            {/* 50/50 Split for Location and POI */}
            <div className="grid grid-cols-2 gap-1">
                {/* 9. Location (50%) */}
                <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-1.5 border border-white/5 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Location</span>
                    <div className="flex items-start gap-1.5 text-[10px] font-medium text-slate-200 leading-tight">
                        <MapPin size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="break-words line-clamp-2 uppercase">{vehicle.location}</span>
                    </div>
                </div>

                {/* 10. POI (50%) */}
                <div className="flex flex-col gap-1 rounded-xl bg-white/5 p-1.5 border border-white/5 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">POI / Landmarks</span>
                    <div className="flex items-start gap-1.5 text-[10px] font-bold text-slate-300 leading-tight">
                        <Activity size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="break-words line-clamp-2 uppercase">{vehicle.poi || "No Landmark Near"}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
