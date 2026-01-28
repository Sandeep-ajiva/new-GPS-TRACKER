"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";

// Dynamically import Map
const HistoryMap = dynamic(() => import("@/components/admin/Map/HistoryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-100" />
});

export default function HistoryPage() {
    // Local state for form
    const [vehicleId, setVehicleId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [shouldFetch, setShouldFetch] = useState(false);

    // API Hooks
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery(undefined);

    // History Query
    // Only run query when shouldFetch is true and we have all params
    const { data: historyDataResponse, isLoading: isHistoryLoading, isFetching } = useGetVehicleHistoryQuery(
        { vehicleId, from: dateFrom, to: dateTo },
        { skip: !shouldFetch || !vehicleId || !dateFrom || !dateTo }
    );

    const vehicles = vehData?.data || [];
    const historyList = historyDataResponse?.data || [];

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (vehicleId && dateFrom && dateTo) {
            setShouldFetch(true);
        } else {
            toast.error("Please select vehicle and date range");
        }
    };

    const isLoading = isHistoryLoading || isFetching;

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
                        <div className="flex-1 min-w-55">
                            <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-slate-500">Select Vehicle</label>
                            <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); }}>
                                <option value="">Choose Vehicle...</option>
                                {vehicles.map((v: any) => (
                                    <option key={v._id} value={v._id}>{v.vehicleNumber} {v.model ? `(${v.model})` : ""}</option>
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
                        <button type="submit" disabled={isLoading} className="rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-50">
                            {isLoading ? <Loader2 className="animate-spin w-4 h-4 mr-2 inline" /> : <Search size={16} className="mr-2 inline" />}
                            {isLoading ? "Loading..." : "View History"}
                        </button>
                    </form>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                    <div className="lg:col-span-1 h-full min-h-75">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
                            <h3 className="text-sm font-black text-slate-900 mb-4 shrink-0">History List</h3>
                            {historyList.length > 0 ? (
                                <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                                    {historyList.map((point: any, idx: number) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                            <div className="text-xs font-semibold text-slate-900">{point.location || `Point ${idx + 1}`}</div>
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
                                <div className="text-sm text-slate-400 text-center py-8 flex-1 flex items-center justify-center">
                                    {shouldFetch && !isLoading ? "No history data found for this period." : "Select parameters to view route."}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="lg:col-span-2 relative flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm overflow-hidden h-full min-h-100">
                        {historyList.length > 0 ? (
                            <HistoryMap pathData={historyList} />
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
