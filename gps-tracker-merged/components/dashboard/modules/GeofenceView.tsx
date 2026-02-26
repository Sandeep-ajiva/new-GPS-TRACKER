"use client";

import { Shield, Plus, Map, Search, Trash2 } from "lucide-react";
import { useGetGeofencesQuery } from "@/redux/api/vehicleApi";
import { useState, useMemo } from "react";

export function GeofenceView() {
    const { data: geofenceData, isLoading, error } = useGetGeofencesQuery(undefined);
    const [searchTerm, setSearchTerm] = useState("");

    const isForbidden = (error as any)?.status === 403;

    const geofences = useMemo(() => {
        if (isForbidden) return [];
        const raw = geofenceData?.data || [];
        if (!searchTerm) return raw;
        return raw.filter((g: any) => g.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [geofenceData, searchTerm, isForbidden]);

    if (isForbidden) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 italic">
                <Shield className="h-12 w-12 mb-4 opacity-20 text-red-500" />
                Access Denied: You do not have permission to view Geofences.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search geofences..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                </div>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-emerald-400 transition-all">
                    <Plus size={14} /> Create New Zone
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {geofences.map((g: any, i: number) => (
                    <div key={i} className="group relative rounded-2xl border border-white/5 bg-slate-800/40 p-5 transition-all hover:bg-slate-800/60 hover:border-emerald-500/30">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/10">
                                <Shield size={20} />
                            </div>
                            <button className="p-2 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <h4 className="text-sm font-black text-slate-100 mb-1">{g.name}</h4>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            <span className="flex items-center gap-1"><Map size={10} /> {g.areaType || "Zone"}</span>
                            {g.radius && <span>Radius: {g.radius}m</span>}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[10px]">
                            <span className="text-slate-500 uppercase tracking-widest">Alert Rule</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">{g.alertOn || "Entry/Exit"}</span>
                        </div>
                    </div>
                ))}

                {/* Draw New Geofence Card */}
                <div className="border-2 border-dashed border-white/5 rounded-2xl p-5 flex flex-col items-center justify-center text-slate-500 hover:border-emerald-500/30 hover:text-emerald-400 transition-all cursor-pointer group">
                    <Plus size={32} className="mb-2 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <span className="text-xs font-black uppercase tracking-widest">Draw New Zone</span>
                </div>
            </div>
        </div>
    );
}
