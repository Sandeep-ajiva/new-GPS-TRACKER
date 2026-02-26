"use client";

import { useState } from "react";
import { Power, Fan, Zap, Signal, Info, Navigation, User, MapPin, Activity, Fuel, Thermometer, Phone, Mail, FileText, X } from "lucide-react";
import type { Vehicle } from "@/lib/vehicles";

export function TelemetryGrid({ vehicle, compact = false }: { vehicle: Vehicle; compact?: boolean }) {
    const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);

    const fields = [
        { label: "IGN", value: vehicle.ign, icon: Power },
        { label: "AC", value: vehicle.ac, icon: Fan },
        { label: "PW", value: vehicle.pw, icon: Zap },
        { label: "GPS", value: vehicle.gps, icon: Signal },
    ];

    return (
        <div className="flex flex-col gap-2 w-full">
            <div className={`grid gap-3 ${compact ? "grid-cols-4 md:grid-cols-8" : "grid-cols-2 md:grid-cols-4 lg:grid-cols-8"}`}>
                <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3 border border-white/5 min-w-0 overflow-hidden shadow-inner">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Vehicle</span>
                    <div className="flex items-center gap-1 font-black text-slate-100 min-w-0">
                        <Navigation size={14} className="text-emerald-400 rotate-45 shrink-0" />
                        <span className="truncate text-[11px] leading-tight uppercase font-mono tracking-tighter" title={vehicle.vehicleNumber || vehicle.id}>
                            {vehicle.vehicleNumber || vehicle.id}
                        </span>
                    </div>
                </div>

                {/* 2. Driver */}
                <button 
                  onClick={() => vehicle.driverDetails && setIsDriverModalOpen(true)}
                  className={`flex flex-col gap-1 rounded-2xl bg-white/5 p-3 border border-white/5 text-left transition-all hover:bg-emerald-500/10 active:scale-95 group shadow-inner ${!vehicle.driverDetails ? "cursor-default" : ""}`}
                >
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-emerald-400 transition-colors">Driver</span>
                    <div className="flex items-center gap-2 truncate font-black text-slate-100 text-[11px] tracking-tight">
                        <User size={14} className="text-emerald-400" />
                        <span className="truncate uppercase">{vehicle.driver}</span>
                    </div>
                </button>

                {/* 3-6. IGN, AC, PW, GPS */}
                {fields.map((field) => (
                    <div key={field.label} className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3 border border-white/5 items-center justify-center shadow-inner group transition-colors hover:bg-white/10">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{field.label}</span>
                        <field.icon className={`h-5 w-5 ${field.value ? "text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "text-white/10"}`} />
                    </div>
                ))}

                <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3 border border-white/5 items-center justify-center shadow-inner group transition-colors hover:bg-white/10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Fuel</span>
                    <div className="flex items-center gap-1.5 text-xs font-black text-amber-400 tracking-tighter">
                        <Fuel size={14} className="group-hover:animate-bounce" />
                        {vehicle.fuel != null ? `${vehicle.fuel}%` : "NA"}
                    </div>
                </div>

                {/* 8. Temp */}
                <div className="flex flex-col gap-1 rounded-2xl bg-white/5 p-3 border border-white/5 items-center justify-center shadow-inner group transition-colors hover:bg-white/10">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Temp</span>
                    <div className="flex items-center gap-1.5 text-xs font-black text-blue-400 tracking-tighter">
                        <Thermometer size={14} />
                        {vehicle.temperature || "NA"}
                    </div>
                </div>

                {/* 9. Speed */}
                <div className="flex flex-col gap-1 rounded-2xl bg-emerald-500/10 p-3 border border-emerald-500/10 items-center justify-center shadow-inner ring-1 ring-emerald-500/20">
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/50">Speed</span>
                    <div className="text-lg font-black text-emerald-400 tracking-tighter">
                        {vehicle.speed} <span className="text-[9px] opacity-70">KM/H</span>
                    </div>
                </div>
            </div>

            {/* Driver Info Modal */}
            {isDriverModalOpen && vehicle.driverDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDriverModalOpen(false)}>
                    <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-slate-800/60">
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-emerald-500/20 p-2">
                                    <User size={20} className="text-emerald-400" />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-black text-slate-100 uppercase tracking-widest truncate">Driver Profile</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight truncate">{vehicle.vehicleNumber}</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDriverModalOpen(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Full Name</span>
                                <div className="text-base font-black text-slate-100">{vehicle.driverDetails.firstName} {vehicle.driverDetails.lastName}</div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
                                    <Phone size={16} className="text-emerald-400" />
                                    <div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Phone Number</div>
                                        <div className="text-xs font-bold text-slate-200">{vehicle.driverDetails.phone}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
                                    <Mail size={16} className="text-blue-400" />
                                    <div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Email Address</div>
                                        <div className="text-xs font-bold text-slate-200">{vehicle.driverDetails.email}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
                                    <FileText size={16} className="text-amber-400" />
                                    <div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">License Number</div>
                                        <div className="text-xs font-bold text-slate-200">{vehicle.driverDetails.licenseNumber}</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 rounded-xl bg-white/5 p-3 border border-white/5">
                                    <MapPin size={16} className="text-red-400 mt-0.5" />
                                    <div>
                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Address</div>
                                        <div className="text-xs font-bold text-slate-200 leading-tight">{vehicle.driverDetails.address || "N/A"}</div>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => setIsDriverModalOpen(false)} className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-black text-slate-900 uppercase tracking-widest transition-transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-emerald-500/20">
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
