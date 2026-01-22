"use client";

import { useParams, useRouter } from "next/navigation";
import SinglePointMap from "@/components/admin/Map/SinglePointMap";

const devices = [
  {
    id: "gps_1",
    imei: "86543210001",
    status: "assigned",
    simNumber: "+91 98989 11111",
    lastPing: "45s ago",
    location: "Connaught Place, Delhi",
    position: { lat: 28.6312, lng: 77.2167 },
  },
  {
    id: "gps_2",
    imei: "86543210002",
    status: "unassigned",
    simNumber: "+91 98989 22222",
    lastPing: "12m ago",
    location: "Chandigarh Sector 17",
    position: { lat: 30.7394, lng: 76.7752 },
  },
];

export default function DeviceDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const device = devices.find((item) => item.id === params.id);

  if (!device) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-slate-300">
        GPS device not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">GPS Device</p>
          <h1 className="text-2xl font-black text-slate-100">{device.imei}</h1>
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-200 hover:bg-slate-900"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Device Details</p>
            <h2 className="text-lg font-black text-slate-100">{device.imei}</h2>
            <div className="mt-4 grid gap-3 text-xs text-slate-300">
              <InfoItem label="Status" value={device.status} />
              <InfoItem label="SIM" value={device.simNumber} />
              <InfoItem label="Last Ping" value={device.lastPing} />
              <InfoItem label="Location" value={device.location} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Health</p>
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <p>Battery: 78%</p>
              <p>Signal Strength: 4/5</p>
              <p>Firmware: v4.2.1</p>
            </div>
          </div>
        </div>
        <div className="h-[520px] rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
          <SinglePointMap position={device.position} label={device.imei} />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
