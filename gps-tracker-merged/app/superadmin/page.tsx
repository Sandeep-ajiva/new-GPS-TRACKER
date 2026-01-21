"use client";

import { Users, Car, Radio, Activity, Plus } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import OrganizationCreateModal from "@/components/admin/Modals/OrganizationCreateModal";

// Dynamically import Map to avoid SSR issues
const DashboardMap = dynamic(() => import("@/components/admin/Map/DashboardMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded-2xl bg-slate-900/60" />
});

export default function DashboardPage() {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const displayOrgs = [
    { _id: "org_ajiva", name: "Ajiva Tracker" },
    { _id: "org_north", name: "North Branch" },
    { _id: "org_west", name: "West Branch" },
  ];
  const displayVehicles = [
    { _id: "veh_1", vehicleNumber: "DL 10CK1840" },
    { _id: "veh_2", vehicleNumber: "PB 10AX2234" },
  ];
  const displayDevices = [
    { _id: "gps_1", imei: "86543210001" },
    { _id: "gps_2", imei: "86543210002" },
  ];
  const displayLiveData = [
    { status: "online" },
    { status: "offline" },
  ];
  const hasApiError = false;

  const onlineVehicles = displayLiveData.filter((v: any) => v.status === "online").length;
  const offlineVehicles = displayVehicles.length - onlineVehicles;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400/70">Command</p>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">SuperAdmin Console</h1>
          <p className="mt-2 text-sm text-slate-400">Real-time overview of your fleet and devices.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsOrgModalOpen(true)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
          >
            <Plus className="h-4 w-4" />
            Add Organization
          </button>
          <div className={`rounded-xl border px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
            hasApiError
              ? "border-amber-500/30 bg-amber-500/20 text-amber-200"
              : "border-emerald-500/30 bg-emerald-500/20 text-emerald-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${hasApiError ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`}></span>
            {hasApiError ? "API Unavailable - Demo Mode" : "System Live"}
          </div>
        </div>
      </div>

      <OrganizationCreateModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Organizations"
          value={displayOrgs.length}
          icon={<Users size={20} />}
          color="blue"
        />
        <StatCard
          title="Total Vehicles"
          value={displayVehicles.length}
          icon={<Car size={20} />}
          color="orange"
        />
        <StatCard
          title="GPS Devices"
          value={displayDevices.length}
          icon={<Radio size={20} />}
          color="purple"
        />
        <StatCard
          title="Online Vehicles"
          value={onlineVehicles}
          icon={<Activity size={20} />}
          color="green"
        />
      </div>

      {/* Map Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 h-125 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
          <DashboardMap />
        </div>

        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 font-bold shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
          <h2 className="mb-8 text-xl font-black tracking-tight text-slate-100">Fleet Status</h2>
          <div className="space-y-6">
            <StatusItem label="Total Fleet" value={displayVehicles.length} color="bg-slate-500" />
            <StatusItem label="Online" value={onlineVehicles} color="bg-emerald-400" />
            <StatusItem label="Offline" value={offlineVehicles} color="bg-rose-400" />
            <StatusItem label="Unassigned Devices" value={Math.max(0, displayDevices.length - displayVehicles.length)} color="bg-amber-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-slate-900/70 text-emerald-200 ring-1 ring-emerald-500/40",
    orange: "bg-slate-900/70 text-amber-200 ring-1 ring-amber-500/40",
    green: "bg-slate-900/70 text-emerald-200 ring-1 ring-emerald-500/40",
    purple: "bg-slate-900/70 text-indigo-200 ring-1 ring-indigo-500/40"
  };

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)] flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
        <h3 className="mt-1 text-2xl font-black text-slate-100">{value}</h3>
      </div>
    </div>
  );
}

function StatusItem({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-lg font-black text-slate-100">{value}</span>
    </div>
  )
}
