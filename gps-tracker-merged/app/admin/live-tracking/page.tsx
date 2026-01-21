"use client";

import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/admin/Map/LiveMap"), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-120px)] w-full animate-pulse rounded-2xl bg-slate-100" />
});

export default function LiveTrackingPage() {
    const demoVehicles = [
        { id: "veh_1", vehicleNumber: "DL 10CK1840", status: "online", lat: 28.6139, lng: 77.209, speed: 42, lastUpdated: new Date().toISOString() },
        { id: "veh_2", vehicleNumber: "PB 10AX2234", status: "offline", lat: 28.7041, lng: 77.1025, speed: 0, lastUpdated: new Date().toISOString() },
    ];
    const onlineCount = demoVehicles.filter((v) => v.status === "online").length;
    const isConnected = true;

    return (
        <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Live Ops</p>
                    <h1 className="text-2xl font-black text-slate-900">Live Tracking</h1>
                    <p className="text-sm text-slate-500">Real-time GPS tracking of your fleet.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700">
                        Online Vehicles: <span className="text-emerald-600">{onlineCount}</span> / {demoVehicles.length}
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${isConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'
                        }`}>
                        <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                        {isConnected ? 'Socket Connected' : 'Disconnected'}
                    </div>
                </div>
            </div>

            <div className="relative flex-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
                <LiveMap vehicles={demoVehicles} />
            </div>
        </div>
    );
}
