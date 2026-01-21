"use client";

import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/admin/Map/LiveMap"), {
    ssr: false,
    loading: () => <div className="h-[calc(100vh-120px)] w-full animate-pulse rounded-2xl bg-slate-900/60" />
});

export default function LiveTrackingPage() {
    const demoVehicles = [
        { id: "veh_1", vehicleNumber: "DL 10CK1840", status: "online", lat: 28.6139, lng: 77.209, speed: 42, lastUpdated: new Date().toISOString() },
        { id: "veh_2", vehicleNumber: "PB 10AX2234", status: "offline", lat: 28.7041, lng: 77.1025, speed: 0, lastUpdated: new Date().toISOString() },
        { id: "veh_3", vehicleNumber: "RJ 14ZX8890", status: "online", lat: 26.9124, lng: 75.7873, speed: 55, lastUpdated: new Date().toISOString() },
    ];
    const onlineCount = demoVehicles.filter((v) => v.status === "online").length;
    const isConnected = true;

    return (
        <div className="flex h-[calc(100vh-100px)] flex-col space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Live Ops</p>
                    <h1 className="text-2xl font-black text-slate-100">Live Tracking</h1>
                    <p className="text-sm text-slate-400">Real-time GPS tracking of your fleet.</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-200">
                        Online Vehicles: <span className="text-emerald-300">{onlineCount}</span> / {demoVehicles.length}
                    </div>
                    <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest ${isConnected ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200' : 'border-rose-500/30 bg-rose-500/20 text-rose-200'
                        }`}>
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                        {isConnected ? 'Socket Connected' : 'Disconnected'}
                    </div>
                </div>
            </div>

            <div className="relative flex-1 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                <LiveMap vehicles={demoVehicles} />
            </div>
        </div>
    );
}
