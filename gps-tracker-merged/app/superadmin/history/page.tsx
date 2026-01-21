"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search } from "lucide-react";

// Dynamically import Map
const HistoryMap = dynamic(() => import("@/components/admin/Map/HistoryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900/60" />
});

export default function HistoryPage() {
    const vehicles = [
        { _id: "veh_1", vehicleNumber: "DL 10CK1840", model: "Camry" },
        { _id: "veh_2", vehicleNumber: "PB 10AX2234", model: "Tata 407" },
    ];

    // Local state for form
    const [vehicleId, setVehicleId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [shouldFetch, setShouldFetch] = useState(false);

    // Fetch History Hook
    const historyData = shouldFetch
        ? [
            { latitude: 28.6139, longitude: 77.209, timestamp: new Date().toISOString(), speed: 42 },
            { latitude: 28.6142, longitude: 77.211, timestamp: new Date().toISOString(), speed: 38 },
            { latitude: 28.6151, longitude: 77.214, timestamp: new Date().toISOString(), speed: 0 },
        ]
        : null;
    const isLoading = false;
    const isFetching = false;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (vehicleId && dateFrom && dateTo) {
            setShouldFetch(true);
        }
    };

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                <div className="mb-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">History</p>
                    <h1 className="text-2xl font-black text-slate-100">Playback</h1>
                    <p className="text-sm text-slate-400">Review trips by vehicle and time range.</p>
                </div>
                <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end w-full">
                    <div className="flex-1 min-w-[220px]">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Select Vehicle</label>
                        <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                            value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); }}>
                            <option value="">Choose Vehicle...</option>
                            {vehicles.map((v: any) => (
                                <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.model})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">From Date/Time</label>
                        <input type="datetime-local" required className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); }} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">To Date/Time</label>
                        <input type="datetime-local" required className="rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                            value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); }} />
                    </div>
                    <button type="submit" disabled={isLoading || isFetching} className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50">
                        <Search size={16} /> {isLoading || isFetching ? "Loading..." : "View History"}
                    </button>
                </form>
            </div>

            <div className="relative flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                {historyData ? (
                    <HistoryMap pathData={historyData} />
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-slate-400">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="font-semibold">Select vehicle and date range to view history</p>
                    </div>
                )}
            </div>
            </div>
        </ApiErrorBoundary>
    );
}
