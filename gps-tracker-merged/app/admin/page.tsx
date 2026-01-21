"use client";

import { Users, Car, Radio, Activity, Plus, ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import OrganizationCreateModal from "@/components/admin/Modals/OrganizationCreateModal";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";
import { VehicleSidebar } from "@/components/dashboard/vehicle-sidebar";
import { MapWrapper } from "@/components/dashboard/map-wrapper";
import { useVehiclePositions } from "@/lib/use-vehicle-positions";
type DashboardVehicle = {
  id: string;
  driver: string;
  date: string;
  speed: number;
  status: "running" | "idle" | "stopped";
  ign: boolean;
  ac: boolean;
  pw: boolean;
  gps: boolean;
  location: string;
  poi: string;
  route: { lat: number; lng: number }[];
};

const defaultCenter = { lat: 28.6139, lng: 77.209 };

const demoOrganizations = [
  { _id: "org_ajiva", name: "Ajiva Tracker" },
  { _id: "org_north", name: "North Branch" },
  { _id: "org_west", name: "West Branch" },
  { _id: "org_south", name: "South Branch" },
];

const demoVehicles = [
  { _id: "veh_1", vehicleNumber: "DL 10CK1840", driverName: "Dave Mathew", organizationId: "org_ajiva", status: "active" },
  { _id: "veh_2", vehicleNumber: "DL 10CK1841", driverName: "Mitchell", organizationId: "org_north", status: "active" },
  { _id: "veh_3", vehicleNumber: "DL 10CK1842", driverName: "Olivia", organizationId: "org_west", status: "active" },
  { _id: "veh_4", vehicleNumber: "DL 10CK1843", driverName: "Ravi", organizationId: "org_south", status: "inactive" },
];

const demoDevices = [
  { _id: "gps_1", imei: "86543210001" },
  { _id: "gps_2", imei: "86543210002" },
  { _id: "gps_3", imei: "86543210003" },
];

const demoLiveData = [
  {
    _id: "live_1",
    organizationId: "org_ajiva",
    vehicleId: "veh_1",
    latitude: 28.6139,
    longitude: 77.209,
    movementStatus: "running",
    currentSpeed: 42,
    ignitionStatus: true,
    acStatus: true,
    currentLocation: "Connaught Place",
  },
  {
    _id: "live_2",
    organizationId: "org_north",
    vehicleId: "veh_2",
    latitude: 28.7041,
    longitude: 77.1025,
    movementStatus: "idle",
    currentSpeed: 0,
    ignitionStatus: true,
    acStatus: false,
    currentLocation: "Rohini",
  },
  {
    _id: "live_3",
    organizationId: "org_west",
    vehicleId: "veh_3",
    latitude: 28.5355,
    longitude: 77.391,
    movementStatus: "stopped",
    currentSpeed: 0,
    ignitionStatus: false,
    acStatus: false,
    currentLocation: "Noida Sector 62",
  },
];

export default function DashboardPage() {
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "idle" | "stopped">("all");

  const displayOrgs = demoOrganizations;
  const displayVehicles = demoVehicles;
  const displayDevices = demoDevices;
  const displayLiveData = demoLiveData;
  const hasApiError = false;

  const onlineVehicles = displayLiveData.filter(
    (v: any) => v.movementStatus === "running" || v.movementStatus === "idle"
  ).length;
  const offlineVehicles = displayVehicles.length - onlineVehicles;

  type OrgPoint = {
    id: string;
    name: string;
    position: { lat: number; lng: number };
  };

  const orgPositions = useMemo<OrgPoint[]>(() => {
    return displayOrgs
      .map((org: any) => {
        const orgId = org._id;
        const orgLive = displayLiveData.filter((entry: any) => {
          const entryOrgId =
            typeof entry.organizationId === "string"
              ? entry.organizationId
              : entry.organizationId?._id;
          return entryOrgId === orgId && entry.latitude && entry.longitude;
        });

        if (orgLive.length === 0) {
          return null;
        }

        const sum = orgLive.reduce(
          (acc: { lat: number; lng: number }, entry: any) => {
            return {
              lat: acc.lat + entry.latitude,
              lng: acc.lng + entry.longitude,
            };
          },
          { lat: 0, lng: 0 }
        );
        const position = {
          lat: sum.lat / orgLive.length,
          lng: sum.lng / orgLive.length,
        };

        return {
          id: orgId,
          name: org.name || "Organization",
          position,
        };
      })
      .filter(Boolean) as OrgPoint[];
  }, [displayOrgs, displayLiveData]);

  const orgPositionMap = useMemo(() => {
    const map: Record<string, { lat: number; lng: number }> = {};
    orgPositions.forEach((org) => {
      map[org.id] = org.position;
    });
    return map;
  }, [orgPositions]);

  const uiVehicles: DashboardVehicle[] = useMemo(() => {
    return displayVehicles.map((vehicle: any, index: number) => {
      const orgId = typeof vehicle.organizationId === "string"
        ? vehicle.organizationId
        : vehicle.organizationId?._id;
      const liveEntry = displayLiveData.find((entry: any) => {
        const entryVehicleId =
          typeof entry.vehicleId === "string"
            ? entry.vehicleId
            : entry.vehicleId?._id;
        return entryVehicleId === vehicle._id;
      });
      const fallbackPosition = orgPositionMap[orgId] || defaultCenter;
      const position = liveEntry?.latitude && liveEntry?.longitude
        ? { lat: liveEntry.latitude, lng: liveEntry.longitude }
        : fallbackPosition;
      const route = [position];
      const status: DashboardVehicle["status"] =
        liveEntry?.movementStatus === "running"
          ? "running"
          : liveEntry?.movementStatus === "idle"
            ? "idle"
            : "stopped";
      return {
        id: vehicle.vehicleNumber || vehicle.registrationNumber || vehicle._id,
        driver: vehicle.driverName || "Unassigned",
        date: new Date().toLocaleString("en-GB").replace(",", ""),
        speed: liveEntry?.currentSpeed || 0,
        status,
        ign: liveEntry?.ignitionStatus ?? false,
        ac: liveEntry?.acStatus ?? false,
        pw: liveEntry?.ignitionStatus ?? false,
        gps: !!liveEntry?.latitude,
        location: liveEntry?.currentLocation || vehicle.lastLocation || "Unknown",
        poi: "-",
        route,
      };
    });
  }, [displayVehicles, displayLiveData, orgPositionMap]);

  const handleSelectOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    setSelectedVehicleId(null);
  };

  const filteredVehicles = useMemo(() => {
    if (!selectedOrgId) return [];
    return uiVehicles.filter((vehicle) => {
      const raw = displayVehicles.find((item: any) =>
        (item.vehicleNumber || item.registrationNumber || item._id) === vehicle.id
      );
      const orgId = typeof raw?.organizationId === "string"
        ? raw.organizationId
        : raw?.organizationId?._id;
      return orgId === selectedOrgId;
    });
  }, [displayVehicles, uiVehicles, selectedOrgId]);

  const visibleVehicles = statusFilter === "all"
    ? filteredVehicles
    : filteredVehicles.filter((vehicle) => vehicle.status === statusFilter);

  const positions = useVehiclePositions(visibleVehicles);

  const orgVehiclePoints = filteredVehicles.map((vehicle) => ({
    id: `${selectedOrgId}:${vehicle.id}`,
    status: vehicle.status,
    position: positions[vehicle.id] || vehicle.route[0],
  }));

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">GPS superAdmin Dashboard</h1>
          <p className="text-gray-500 font-bold mt-1">Real-time overview of your fleet and devices.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsOrgModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Organization
          </button>
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
      {selectedOrgId ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedOrgId(null);
                setSelectedVehicleId(null);
              }}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              All Organizations
            </button>
            <div className="text-sm font-black text-gray-600 uppercase tracking-widest">
              Showing vehicles for selected organization
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", "running", "idle", "stopped"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter as typeof statusFilter)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${
                  statusFilter === filter
                    ? "bg-emerald-500 text-white border-emerald-500"
                    : "bg-white text-gray-500 border-gray-200 hover:border-emerald-400"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
              <VehicleSidebar
                vehicles={visibleVehicles}
                selectedId={selectedVehicleId}
                onSelect={(id) => setSelectedVehicleId(id === selectedVehicleId ? null : id)}
                statusFilter={statusFilter === "all" ? "total" : statusFilter}
              />
            </div>
            <div className="lg:col-span-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-130">
              <MapWrapper
                selectedVehicleId={selectedVehicleId}
                positions={positions}
                vehicles={visibleVehicles}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-black text-gray-900 mb-4">Organizations</h2>
              <div className="space-y-3">
                {orgPositions.map((org) => {
                  const orgVehicleCount = displayVehicles.filter((vehicle: any) => {
                    const orgId = typeof vehicle.organizationId === "string"
                      ? vehicle.organizationId
                      : vehicle.organizationId?._id;
                    return orgId === org.id;
                  }).length;
                  return (
                    <button
                      key={org.id}
                      onClick={() => handleSelectOrg(org.id)}
                      className="w-full text-left rounded-xl border border-gray-200 px-4 py-3 hover:border-emerald-400 hover:bg-emerald-50 transition-colors"
                    >
                      <div className="text-sm font-black text-gray-800">{org.name}</div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                        {orgVehicleCount} Vehicles
                      </div>
                    </button>
                  );
                })}
              </div>
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

          <div className="lg:col-span-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-130">
            <OrganizationMap
              organizations={orgPositions}
              vehicles={orgVehiclePoints}
              selectedOrgId={selectedOrgId}
              selectedVehicleId={selectedVehicleId}
              onOrgSelect={handleSelectOrg}
            />
          </div>
        </div>
      )}
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
