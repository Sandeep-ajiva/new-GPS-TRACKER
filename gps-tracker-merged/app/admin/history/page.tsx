"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search } from "lucide-react";
import { toast } from "sonner";

// Dynamically import Map
const HistoryMap = dynamic(() => import("@/components/admin/Map/HistoryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-100" />
});

import { getVehicles } from "@/lib/admin-dummy-data";

export default function HistoryPage() {
    const vehicles = getVehicles();

    // Local state for form
    const [vehicleId, setVehicleId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [shouldFetch, setShouldFetch] = useState(false);
    const [historyList, setHistoryList] = useState<any[]>([]);

    // Generate dummy history data
    const generateHistoryData = () => {
        if (!vehicleId || !dateFrom || !dateTo) return null;
        
        const points = [];
        const startDate = new Date(dateFrom);
        const endDate = new Date(dateTo);
        const diffTime = endDate.getTime() - startDate.getTime();
        const diffHours = diffTime / (1000 * 60 * 60);
        const numPoints = Math.min(Math.max(Math.floor(diffHours), 5), 50);
        
        for (let i = 0; i < numPoints; i++) {
            const lat = 28.6139 + (Math.random() - 0.5) * 0.1;
            const lng = 77.209 + (Math.random() - 0.5) * 0.1;
            const timestamp = new Date(startDate.getTime() + (diffTime * i / numPoints));
            points.push({
                latitude: lat,
                longitude: lng,
                timestamp: timestamp.toISOString(),
                speed: Math.floor(Math.random() * 80),
                location: `Location ${i + 1}`,
            });
        }
        return points;
    };

    const historyData = shouldFetch ? generateHistoryData() : null;
    const isLoading = false;
    const isFetching = false;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (vehicleId && dateFrom && dateTo) {
            setShouldFetch(true);
            const data = generateHistoryData();
            if (data) {
                setHistoryList(data);
            }
        } else {
            toast.error("Please select vehicle and date range");
        }
    };

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">History</p>
                        <h1 className="text-2xl font-black text-slate-900">Playback</h1>
                        <p className="text-sm text-slate-500">Review trips by vehicle and time range.</p>
                    </div>
                    <form onSubmit={handleSearch} className="flex flex-wrap gap-4 items-end w-full">
                    <div className="flex-1 min-w-[220px]">
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Select Vehicle</label>
                        <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                            value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); }}>
                            <option value="">Choose Vehicle...</option>
                            {vehicles.map((v: any) => (
                                <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.model})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">From Date/Time</label>
                        <input type="datetime-local" required className="rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); }} />
                    </div>
                    <div>
                        <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">To Date/Time</label>
                        <input type="datetime-local" required className="rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                            value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); }} />
                    </div>
                    <button type="submit" disabled={isLoading || isFetching} className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800 disabled:opacity-50">
                        <Search size={16} /> {isLoading || isFetching ? "Loading..." : "View History"}
                    </button>
                </form>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-black text-slate-900 mb-4">History List</h3>
                        {historyList.length > 0 ? (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {historyList.map((point, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="text-xs font-semibold text-slate-900">{point.location}</div>
                                        <div className="text-[10px] text-slate-500 mt-1">
                                            {new Date(point.timestamp).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-slate-600 mt-1">
                                            Speed: {point.speed} km/h
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400 text-center py-8">
                                No history data. Search to view route.
                            </div>
                        )}
                    </div>
                </div>
                <div className="lg:col-span-2 relative flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm min-h-[400px]">
                    {historyData ? (
                        <HistoryMap pathData={historyData} />
                    ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-slate-400">
                            <Search size={48} className="mb-4 opacity-20" />
                            <p className="font-semibold">Select vehicle and date range to view history</p>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </ApiErrorBoundary>
    );
}
