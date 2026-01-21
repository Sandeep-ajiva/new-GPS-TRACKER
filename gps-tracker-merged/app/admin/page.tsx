"use client";

import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";
import {
  Users,
  Car,
  Radio,
  MapPin,
  ArrowUpRight,
  Activity
} from "lucide-react";
import dynamic from "next/dynamic";

// Dynamically import Map to avoid SSR issues
const DashboardMap = dynamic(() => import("@/components/admin/Map/DashboardMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />
});

export default function DashboardPage() {
  // Use fallback data if API is not available
  const { data: organizations = [], isLoading: orgsLoading, error: orgsError } = useGetOrganizationsQuery({});
  const { data: vehicles = [], isLoading: vehiclesLoading, error: vehiclesError } = useGetVehiclesQuery({});
  const { data: devices = [], isLoading: devicesLoading, error: devicesError } = useGetGpsDevicesQuery({});
  const { data: liveData = [], isLoading: liveLoading, error: liveError } = useGetLiveVehiclesQuery({});

  // Show fallback data if API is unavailable
  const hasApiError = orgsError || vehiclesError || devicesError || liveError;
  const displayOrgs = Array.isArray(organizations) ? organizations : [];
  const displayVehicles = Array.isArray(vehicles) ? vehicles : [];
  const displayDevices = Array.isArray(devices) ? devices : [];
  const displayLiveData = Array.isArray(liveData) ? liveData : [];

  const onlineVehicles = displayLiveData.filter((v: any) => v.status === "online").length;
  const offlineVehicles = displayVehicles.length - onlineVehicles;

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">GPS Admin Dashboard</h1>
          <p className="text-gray-500 font-bold mt-1">Real-time overview of your fleet and devices.</p>
        </div>
        <div className="flex gap-3">
          <div className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest ${
            hasApiError 
              ? "bg-yellow-100 text-yellow-700 border-yellow-200" 
              : "bg-green-100 text-green-700 border-green-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${hasApiError ? "bg-yellow-500" : "bg-green-500 animate-pulse"}`}></span>
            {hasApiError ? "API Unavailable - Demo Mode" : "System Live"}
          </div>
        </div>
      </div>

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
        <div className="lg:col-span-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-[500px]">
          <DashboardMap />
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 font-bold">
          <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Fleet Status</h2>
          <div className="space-y-6">
            <StatusItem label="Total Fleet" value={displayVehicles.length} color="bg-gray-200" />
            <StatusItem label="Online" value={onlineVehicles} color="bg-green-500" />
            <StatusItem label="Offline" value={offlineVehicles} color="bg-red-500" />
            <StatusItem label="Unassigned Devices" value={Math.max(0, displayDevices.length - displayVehicles.length)} color="bg-yellow-500" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-600 shadow-blue-200",
    orange: "bg-orange-500 shadow-orange-200",
    green: "bg-green-500 shadow-green-200",
    purple: "bg-purple-600 shadow-purple-200"
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl shadow-lg text-white ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
      </div>
    </div>
  );
}

function StatusItem({ label, value, color }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-lg font-black text-gray-900">{value}</span>
    </div>
  )
}
