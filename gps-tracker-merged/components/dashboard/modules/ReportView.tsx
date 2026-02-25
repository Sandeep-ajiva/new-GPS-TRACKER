"use client";

import { useState } from "react";
import { FileText, Download, Calendar, Filter, ChevronDown, Table as TableIcon } from "lucide-react";

export function ReportView() {
    const [reportType, setReportType] = useState("General");
    const [dateRange, setDateRange] = useState({ start: "", end: "" });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Report Type */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Report Type</label>
                    <div className="relative">
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-100 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all hover:bg-white/10"
                        >
                            <option value="General">General Report</option>
                            <option value="Trip">Trip Report</option>
                            <option value="Idle">Idle Report</option>
                            <option value="Alert">Alert Report</option>
                            <option value="Fuel">Fuel Report</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Date From */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date From</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                        />
                        <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>

                {/* Date To */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date To</label>
                    <div className="relative">
                        <input
                            type="date"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all [color-scheme:dark]"
                        />
                        <Calendar size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 py-4 border-y border-white/5">
                <button className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-tighter hover:bg-emerald-400 transition-all active:scale-95">
                    <Filter size={14} /> Generate Report
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 text-slate-100 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                    <Download size={14} /> Export PDF
                </button>
                <button className="flex items-center gap-2 px-6 py-2.5 bg-white/5 border border-white/10 text-slate-100 rounded-xl text-xs font-bold hover:bg-white/10 transition-all">
                    <Download size={14} /> Export Excel
                </button>
            </div>

            {/* Placeholder Table */}
            <div className="rounded-2xl border border-white/5 bg-slate-950/30 p-8 flex flex-col items-center justify-center text-slate-500 italic text-center min-h-[300px]">
                <TableIcon size={48} className="mb-4 opacity-10" />
                <p className="text-sm">Click "Generate Report" to view results</p>
                <p className="text-[10px] uppercase tracking-widest mt-2 opacity-50">Report engine ready</p>
            </div>
        </div>
    );
}
