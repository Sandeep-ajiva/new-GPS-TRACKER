"use client";

import { Users, Car, Radio, Activity, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OrganizationCreateModal from "@/components/admin/Modals/OrganizationCreateModal";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";
import { VehicleSidebar } from "@/components/dashboard/vehicle-sidebar";
import { MapWrapper } from "@/components/dashboard/map-wrapper";
import { useVehiclePositions } from "@/lib/use-vehicle-positions";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";

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

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryFromSuperadmin = searchParams.get("from") === "superadmin";
  const queryOrgId = searchParams.get("org");
  const [fromSuperadmin, setFromSuperadmin] = useState(false);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);

  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "running" | "idle" | "stopped">("all");

  // Redux Data Fetching
  const { data: orgData, isLoading: isLoadingOrgs } = useGetOrganizationsQuery(undefined);
  const { data: vehData, isLoading: isLoadingVehicles } = useGetVehiclesQuery(undefined);
  const { data: devData, isLoading: isLoadingDevices } = useGetGpsDevicesQuery(undefined);
  const { data: liveData, isLoading: isLoadingLive } = useGetLiveVehiclesQuery(undefined, {
    pollingInterval: 5000 // Poll every 5 seconds for live updates
  });

  const displayOrgs = orgData?.data || [];
  const displayVehicles = vehData?.data || [];
  const displayDevices = devData?.data || [];
  const displayLiveData = liveData?.data || []; // Note: Ensure backend returns array or adapt

  const isLoading = isLoadingOrgs || isLoadingVehicles || isLoadingDevices || isLoadingLive;


  useEffect(() => {
    let selectedOrg = queryOrgId;
    let fromSuper = queryFromSuperadmin;

    if (typeof window !== "undefined") {
      const storedOrg = sessionStorage.getItem("adminSelectedOrgId");
      const storedFrom = sessionStorage.getItem("adminFromSuperadmin");
      if (!selectedOrg && storedOrg) {
        selectedOrg = storedOrg;
      }
      if (!fromSuper && storedFrom === "true") {
        fromSuper = true;
      }
    }

    setTargetOrgId(selectedOrg);
    setFromSuperadmin(fromSuper);
  }, [queryOrgId, queryFromSuperadmin]);

  useEffect(() => {
    if (targetOrgId) {
      setSelectedOrgId(targetOrgId);
    }
  }, [targetOrgId]);

  const onlineVehicles = useMemo(() => {
    if (!displayVehicles.length || !displayLiveData.length) return 0;
    const onlineIds = new Set(displayLiveData.map((d: any) => d.vehicleId?._id || d.vehicleId));
    return displayVehicles.filter((v: any) => onlineIds.has(v._id)).length;
  }, [displayVehicles, displayLiveData]);

  const offlineVehicles = displayVehicles.length - onlineVehicles;

  type OrgPoint = {
    id: string;
    name: string;
    position: { lat: number; lng: number };
  };

  const orgPositions = useMemo<OrgPoint[]>(() => {
    if (!displayOrgs.length) return [];

    return displayOrgs
      .map((org: any) => {
        const orgId = org._id;

        // Find live data for this org directly if possible, or filter
        const orgLive = displayLiveData.filter((entry: any) => {
          // Handle both populated and unpopulated organizationId
          const entryOrgId = entry.organizationId?._id || entry.organizationId;
          return entryOrgId === orgId && entry.latitude && entry.longitude;
        });

        if (orgLive.length === 0) {
          // Use org address/geo if no live vehicles, or default to center if absolutely nothing
          if (org.geo?.lat && org.geo?.lng) {
            return {
              id: orgId,
              name: org.name || "Organization",
              position: { lat: org.geo.lat, lng: org.geo.lng }
            }
          }
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
    return displayVehicles.map((vehicle: any) => {
      const orgId = typeof vehicle.organizationId === "string"
        ? vehicle.organizationId
        : vehicle.organizationId?._id;

      const liveEntry = displayLiveData.find((entry: any) => {
        const entryVehicleId = entry.vehicleId?._id || entry.vehicleId;
        return entryVehicleId === vehicle._id;
      });

      const fallbackPosition = orgPositionMap[orgId] || defaultCenter;

      const position = liveEntry?.latitude && liveEntry?.longitude
        ? { lat: liveEntry.latitude, lng: liveEntry.longitude }
        : fallbackPosition;

      const route = [position];

      // Determine status from live data if available, otherwise default
      let status: DashboardVehicle["status"] = "stopped";
      if (liveEntry) {
        if (liveEntry.speed > 0) status = "running";
        else if (liveEntry.ignition) status = "idle";
        else status = "stopped";
      }

      return {
        id: vehicle.vehicleNumber || vehicle.registrationNumber || vehicle._id,
        driver: vehicle.driverName || "Unassigned", // Ensure backend populates or sends this
        date: liveEntry?.lastUpdated ? new Date(liveEntry.lastUpdated).toLocaleString("en-GB") : new Date().toLocaleString("en-GB"),
        speed: liveEntry?.speed || 0,
        status,
        ign: liveEntry?.ignition ?? false,
        ac: liveEntry?.ac ?? false, // Check backend key
        pw: true, // Power usually true if sending data
        gps: !!(liveEntry?.latitude && liveEntry?.longitude),
        location: liveEntry?.address || "Unknown", // Backend needs to reverse geocode or send address
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
      // Find original vehicle to check org ID
      const raw: any = displayVehicles.find((item: any) =>
        (item.vehicleNumber || item.registrationNumber || item._id) === vehicle.id
      );
      if (!raw) return false;
      const orgId = raw.organizationId?._id || raw.organizationId;
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

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={48} /></div>
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">GPS Admin Dashboard</h1>
          <p className="text-gray-500 font-bold mt-1">Real-time overview of your fleet and devices.</p>
        </div>
        <div className="flex gap-3 items-center">
          {fromSuperadmin && (
            <button
              onClick={() => router.push("/superadmin")}
              className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to SuperAdmin
            </button>
          )}
          <button
            onClick={() => setIsOrgModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Sub-Organization
          </button>
          <div className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest bg-green-100 text-green-700 border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            System Live
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
          onClick={() => router.push("/admin/organizations")}
        />
        <StatCard
          title="Total Vehicles"
          value={displayVehicles.length}
          icon={<Car size={20} />}
          color="orange"
          onClick={() => router.push("/admin/vehicles")}
        />
        <StatCard
          title="GPS Devices"
          value={displayDevices.length}
          icon={<Radio size={20} />}
          color="purple"
          onClick={() => router.push("/admin/gps-devices")}
        />
        <StatCard
          title="Online Vehicles"
          value={onlineVehicles}
          icon={<Activity size={20} />}
          color="green"
          onClick={() => router.push("/admin/vehicles?filter=online")}
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
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${statusFilter === filter
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
                    const orgId = vehicle.organizationId?._id || vehicle.organizationId;
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
                {/* Empty State */}
                {orgPositions.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-xs">No organizations found with GPS data.</div>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 font-bold">
              <h2 className="text-xl font-black text-gray-900 tracking-tight mb-8">Fleet Status</h2>
              <div className="space-y-6">
                <StatusItem label="Total Fleet" value={displayVehicles.length} color="bg-gray-200" />
                <StatusItem label="Online" value={onlineVehicles} color="bg-green-500" />
                <StatusItem label="Offline" value={offlineVehicles} color="bg-red-500" />
                <StatusItem label="Unassigned Devices" value={Math.max(0, displayDevices.length - displayVehicles.filter((v: any) => v.assignedDeviceId).length)} color="bg-yellow-500" />
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

function StatCard({ title, value, icon, color, onClick }: any) {
  const colors: any = {
    blue: "bg-blue-600 shadow-blue-200",
    orange: "bg-orange-500 shadow-orange-200",
    green: "bg-green-500 shadow-green-200",
    purple: "bg-purple-600 shadow-purple-200"
  };

  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow cursor-pointer text-left w-full"
    >
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl shadow-lg text-white ${colors[color]}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-2xl font-black text-gray-900 mt-1">{value}</h3>
      </div>
    </button>
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
