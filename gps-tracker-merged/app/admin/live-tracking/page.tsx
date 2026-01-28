"use client";

import dynamic from "next/dynamic";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Loader2 } from "lucide-react";

const LiveMap = dynamic(() => import("@/components/admin/Map/LiveMap"), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-120px)] w-full animate-pulse rounded-2xl bg-slate-100" />
});

export default function LiveTrackingPage() {
    const { data: liveDataRes, isLoading } = useGetLiveVehiclesQuery(undefined, {
        pollingInterval: 30000, // Changed from 5000ms to 30000ms to reduce excessive API calls
        refetchOnMountOrArgChange: true,
        refetchOnFocus: false, // Disable refetch on focus to avoid unnecessary calls
        refetchOnReconnect: true
    });

    const liveData = liveDataRes?.data || [];

    // Map API data to LiveMap expected format
    const vehicles = liveData.map((item: any) => ({
        id: item.vehicleId?._id || item._id,
        vehicleNumber: item.vehicleId?.vehicleNumber || "Unknown",
        lat: item.latitude || 0,
        lng: item.longitude || 0,
        speed: item.currentSpeed || 0,
        status: item.movementStatus || "offline", // backend has movementStatus: stopped/moving? or online/offline logic needed based on last update
        lastUpdated: item.updatedAt || new Date().toISOString()
    }));

    // Simple online/offline logic based on recent update (e.g. 5 mins)
    const isOnline = (lastUpdated: string) => {
        const diff = Date.now() - new Date(lastUpdated).getTime();
        return diff < 5 * 60 * 1000;
    };

    const onlineCount = vehicles.filter((v: any) => isOnline(v.lastUpdated)).length;
    // Assuming socket connection state is handled by Redux or parent, here we just show "Connected" if data loads
    const isConnected = !isLoading;

    if (isLoading && vehicles.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-slate-500" size={32} />
            </div>
        )
    }

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Live Ops</p>
                        <h1 className="text-2xl font-black text-slate-900">Live Tracking</h1>
                        <p className="text-sm text-slate-500">Real-time GPS tracking of your fleet.</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700">
                            Online Vehicles: <span className="text-emerald-600">{onlineCount}</span> / {vehicles.length}
                        </div>
                        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${isConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                            }`}>
                            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                            {isConnected ? 'Live Updates Active' : 'Connecting...'}
                        </div>
                    </div>
                </div>

                <div className="relative flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                    <LiveMap vehicles={vehicles} />
                </div>
            </div>
        </ApiErrorBoundary>
    );
}
