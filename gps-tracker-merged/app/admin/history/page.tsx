"use client";

import { useState } from "react";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetVehicleHistoryQuery } from "@/redux/api/gpsHistoryApi";
import dynamic from "next/dynamic";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Search } from "lucide-react";

// Dynamically import Map
const HistoryMap = dynamic(() => import("@/components/admin/Map/HistoryMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />
});

export default function HistoryPage() {
    const { data: vehicles, error: vehiclesError } = useGetVehiclesQuery({});

    // Local state for form
    const [vehicleId, setVehicleId] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [shouldFetch, setShouldFetch] = useState(false);

    // Fetch History Hook
    const { data: historyData, isLoading, isFetching } = useGetVehicleHistoryQuery(
        { vehicleId, from: dateFrom, to: dateTo },
        { skip: !shouldFetch }
    );

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (vehicleId && dateFrom && dateTo) {
            setShouldFetch(true);
        }
    };

    return (
        <ApiErrorBoundary hasError={!!vehiclesError}>
            <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <form onSubmit={handleSearch} className="flex gap-4 items-end w-full">
                    <div className="flex-1 max-w-xs">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Vehicle</label>
                        <select required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={vehicleId} onChange={e => { setVehicleId(e.target.value); setShouldFetch(false); }}>
                            <option value="">Choose Vehicle...</option>
                            {vehicles?.map((v: any) => (
                                <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.model})</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From Date/Time</label>
                        <input type="datetime-local" required className="border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={dateFrom} onChange={e => { setDateFrom(e.target.value); setShouldFetch(false); }} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To Date/Time</label>
                        <input type="datetime-local" required className="border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={dateTo} onChange={e => { setDateTo(e.target.value); setShouldFetch(false); }} />
                    </div>
                    <button type="submit" disabled={isLoading || isFetching} className="bg-[#1877F2] text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50">
                        <Search size={16} /> {isLoading || isFetching ? "Loading..." : "View History"}
                    </button>
                </form>
            </div>

            <div className="flex-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 relative">
                {historyData ? (
                    <HistoryMap pathData={historyData} />
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-gray-400">
                        <Search size={48} className="mb-4 opacity-20" />
                        <p className="font-medium">Select vehicle and date range to view history</p>
                    </div>
                )}
            </div>
            </div>
        </ApiErrorBoundary>
    );
}
