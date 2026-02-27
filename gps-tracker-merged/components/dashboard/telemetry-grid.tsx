"use client";

import { useState } from "react";
import { Power, Fan, Zap, Signal, Navigation, User, MapPin, Fuel, Thermometer, Phone, Mail, FileText, X } from "lucide-react";
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
        <div className="w-full">
            <div className={`grid gap-3 text-sm ${compact ? "grid-cols-3" : "grid-cols-3 md:grid-cols-4 lg:grid-cols-5"}`}>
                <div className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                    <span className="block text-xs text-gray-400">Vehicle</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-white">
                        <Navigation size={14} className="text-green-500" />
                        <span className="truncate text-xs" title={vehicle.vehicleNumber || vehicle.id}>
                            {vehicle.vehicleNumber || vehicle.id}
                        </span>
                    </div>
                </div>

                <button
                    onClick={() => vehicle.driverDetails && setIsDriverModalOpen(true)}
                    className={`rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151] ${!vehicle.driverDetails ? "cursor-default" : ""}`}
                >
                    <span className="block text-xs text-gray-400">Driver</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-white">
                        <User size={14} className="text-green-500" />
                        <span className="truncate text-xs">{vehicle.driver || "Unassigned"}</span>
                    </div>
                </button>

                {fields.map((field) => (
                    <div key={field.label} className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                        <span className="block text-xs text-gray-400">{field.label}</span>
                        <div className="mt-1 flex justify-center">
                            <field.icon className={`h-4 w-4 ${field.value ? "text-green-500" : "text-gray-500"}`} />
                        </div>
                    </div>
                ))}

                <div className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                    <span className="block text-xs text-gray-400">Fuel</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-white">
                        <Fuel size={14} className="text-amber-400" />
                        <span className="text-xs">{vehicle.fuel != null ? `${vehicle.fuel}%` : "NA"}</span>
                    </div>
                </div>

                <div className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                    <span className="block text-xs text-gray-400">Temp</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-white">
                        <Thermometer size={14} className="text-sky-400" />
                        <span className="text-xs">{vehicle.temperature || "NA"}</span>
                    </div>
                </div>

                <div className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                    <span className="block text-xs text-gray-400">Speed</span>
                    <div className="mt-1 text-sm font-semibold text-white">
                        {vehicle.speed} <span className="text-xs text-gray-400">KM/H</span>
                    </div>
                </div>

                <div className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                    <span className="block text-xs text-gray-400">Location</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-white">
                        <MapPin size={14} className="text-red-400" />
                        <span className="truncate text-xs" title={vehicle.location || "Unknown"}>
                            {vehicle.location ? vehicle.location.split(',')[0] : "Unknown"}
                        </span>
                    </div>
                </div>

                <div className="rounded-md bg-[#111827] p-2 text-center transition-all duration-200 hover:bg-[#374151]">
                    <span className="block text-xs text-gray-400">POI</span>
                    <div className="mt-1 flex items-center justify-center gap-1 text-white">
                        <Navigation size={14} className="text-blue-400" />
                        <span className="truncate text-xs" title={vehicle.poi || "No POI"}>
                            {vehicle.poi ? vehicle.poi.split(',')[0] : "No POI"}
                        </span>
                    </div>
                </div>
            </div>

            {isDriverModalOpen && vehicle.driverDetails && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsDriverModalOpen(false)}>
                    <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
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
                                        <div className="text-xs font-bold text-slate-200 leading-tight">
    {vehicle.driverDetails.address || 
     `${vehicle.driverDetails.firstName || "Driver"} ${vehicle.driverDetails.lastName || ""}'s Address, Sector 15, Delhi - 110001`}
</div>
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
