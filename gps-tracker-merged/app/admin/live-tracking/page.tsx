"use client";

import dynamic from "next/dynamic";
import { useAppSelector } from "@/redux/hooks";

const LiveMap = dynamic(() => import("@/components/admin/Map/LiveMap"), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-120px)] w-full bg-gray-100 animate-pulse rounded-xl" />
});

export default function LiveTrackingPage() {
    const { isConnected, liveVehicles } = useAppSelector((state: any) => state.liveTracking);
    const onlineCount = liveVehicles.filter((v: any) => v.status === 'online').length;

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Live Tracking</h1>
                    <p className="text-sm text-gray-500">Real-time GPS tracking of your fleet.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100 text-sm font-bold">
                        Online Vehicles: <span className="text-green-600">{onlineCount}</span> / {liveVehicles.length}
                    </div>
                    <div className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 border ${isConnected ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                        {isConnected ? 'Socket Connected' : 'Disconnected'}
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 relative">
                <LiveMap />
            </div>
        </div>
    );
}
