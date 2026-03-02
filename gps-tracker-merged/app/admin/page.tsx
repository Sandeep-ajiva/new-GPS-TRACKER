"use client";

import { Users, Car, Radio, Activity, ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";
import { VehicleSidebar } from "@/components/dashboard/vehicle-sidebar";
import { MapWrapper } from "@/components/dashboard/map-wrapper";
import { DashboardProvider } from "@/components/dashboard/DashboardContext";
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
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<"all" | "running" | "idle" | "stopped">("all");

  /* =========================
     RTK QUERY (FORCED LOAD)
  ========================= */
  const { data: orgData, isLoading: isLoadingOrgs } =
    useGetOrganizationsQuery(undefined, { refetchOnMountOrArgChange: true });

  const { data: vehData, isLoading: isLoadingVehicles } =
    useGetVehiclesQuery(undefined, { refetchOnMountOrArgChange: true });

  const { data: devData, isLoading: isLoadingDevices } =
    useGetGpsDevicesQuery(undefined, { refetchOnMountOrArgChange: true });

  const { data: liveData, isLoading: isLoadingLive } =
    useGetLiveVehiclesQuery(undefined, {
      pollingInterval: 30000, // Changed from 5000ms to 30000ms (30 seconds) to reduce excessive API calls
      refetchOnMountOrArgChange: true,
    });

  /* =========================
     SAFE RESPONSE MAPPING
  ========================= */
  const displayOrgs = orgData?.organizations || orgData?.data || [];
  const displayVehicles = vehData?.vehicles || vehData?.data || [];
  const displayDevices = devData?.devices || devData?.data || [];
  const displayLiveData = liveData?.vehicles || liveData?.data || [];

  const isLoading =
    isLoadingOrgs || isLoadingVehicles || isLoadingDevices || isLoadingLive;

  /* =========================
     URL + SESSION HANDLING
  ========================= */
  useEffect(() => {
    let selectedOrg = queryOrgId;
    let fromSuper = queryFromSuperadmin;

    if (typeof window !== "undefined") {
      const storedOrg = sessionStorage.getItem("adminSelectedOrgId");
      const storedFrom = sessionStorage.getItem("adminFromSuperadmin");

      if (!selectedOrg && storedOrg) selectedOrg = storedOrg;
      if (!fromSuper && storedFrom === "true") fromSuper = true;
    }

    setTargetOrgId(selectedOrg);
    setFromSuperadmin(fromSuper);
  }, [queryOrgId, queryFromSuperadmin]);

  useEffect(() => {
    if (targetOrgId) setSelectedOrgId(targetOrgId);
  }, [targetOrgId]);

  /* =========================
     ONLINE / OFFLINE FIX
  ========================= */
  const onlineVehicleIds = useMemo(() => {
    return new Set(
      displayLiveData.map((d: any) =>
        String(d.vehicleId?._id || d.vehicleId)
      )
    );
  }, [displayLiveData]);

  const onlineVehicles = displayVehicles.filter((v: any) =>
    onlineVehicleIds.has(String(v._id))
  ).length;

  const offlineVehicles = displayVehicles.length - onlineVehicles;

  /* =========================
     ORG POSITIONS
  ========================= */
  const orgPositions = useMemo(() => {
    return displayOrgs.map((org: any) => {
      const orgLive = displayLiveData.filter((l: any) => {
        const oid = l.organizationId?._id || l.organizationId;
        return oid === org._id && l.latitude && l.longitude;
      });

      if (!orgLive.length) {
        return {
          id: org._id,
          name: org.name || "Organization",
          position: org.geo?.lat
            ? { lat: org.geo.lat, lng: org.geo.lng }
            : defaultCenter,
        };
      }

      const avg = orgLive.reduce(
        (a: any, c: any) => ({
          lat: a.lat + c.latitude,
          lng: a.lng + c.longitude,
        }),
        { lat: 0, lng: 0 }
      );

      return {
        id: org._id,
        name: org.name || "Organization",
        position: {
          lat: avg.lat / orgLive.length,
          lng: avg.lng / orgLive.length,
        },
      };
    });
  }, [displayOrgs, displayLiveData]);

  const orgPositionMap = useMemo(() => {
    const map: Record<string, { lat: number; lng: number }> = {};
    orgPositions.forEach((o: any) => (map[o.id] = o.position));
    return map;
  }, [orgPositions]);

  /* =========================
     VEHICLE UI DATA
  ========================= */
  const uiVehicles: DashboardVehicle[] = useMemo(() => {
    return displayVehicles.map((vehicle: any) => {
      const live = displayLiveData.find(
        (l: any) =>
          String(l.vehicleId?._id || l.vehicleId) === String(vehicle._id)
      );

      let status: DashboardVehicle["status"] = "stopped";
      if (live) {
        if (live.speed > 0) status = "running";
        else if (live.ignition) status = "idle";
      }

      const fallback =
        orgPositionMap[vehicle.organizationId?._id || vehicle.organizationId] ||
        defaultCenter;

      const position =
        live?.latitude && live?.longitude
          ? { lat: live.latitude, lng: live.longitude }
          : fallback;

      return {
        id: vehicle._id,
        driver: vehicle.driverName || "Unassigned",
        date: live?.lastUpdated
          ? new Date(live.lastUpdated).toLocaleString("en-GB")
          : new Date().toLocaleString("en-GB"),
        speed: live?.speed || 0,
        status,
        ign: !!live?.ignition,
        ac: !!live?.ac,
        pw: true,
        gps: !!(live?.latitude && live?.longitude),
        location: live?.address || "Unknown",
        poi: "-",
        route: [position],
      };
    });
  }, [displayVehicles, displayLiveData, orgPositionMap]);

  /* =========================
     FILTERING (REMOVED - TRUST BACKEND)
     ========================= */
  const visibleVehicles = useMemo(() => {
    // 🔐 ORG CONTEXT UPDATE
    // No longer filtering by selectedOrgId in frontend.
    // Backend already scopes displayVehicles based on user hierarchy.
    if (statusFilter === "all") return uiVehicles;
    return uiVehicles.filter((v) => v.status === statusFilter);
  }, [uiVehicles, statusFilter]);

  const positions = useVehiclePositions(visibleVehicles);

  /* =========================
     LOADER
  ========================= */
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  /* =========================
     JSX (UNCHANGED)
  ========================= */
  return (
    <div className="space-y-8 pb-10">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            GPS Admin Dashboard
          </h1>
          <p className="text-gray-500 font-bold mt-1">
            Real-time overview of your fleet and devices.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {fromSuperadmin && (
            <button
              onClick={() => router.push("/superadmin")}
              className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to SuperAdmin
            </button>
          )}

          <div className="px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 border uppercase tracking-widest bg-green-100 text-green-700 border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            System Live
          </div>
        </div>
      </div>

      {/* ===== STATS ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Organizations" value={displayOrgs.length} icon={<Users size={20} />} color="blue" />
        <StatCard title="Total Vehicles" value={displayVehicles.length} icon={<Car size={20} />} color="orange" />
        <StatCard title="GPS Devices" value={displayDevices.length} icon={<Radio size={20} />} color="purple" />
        <StatCard title="Online Vehicles" value={onlineVehicles} icon={<Activity size={20} />} color="green" />
      </div>

      {/* ===== MAP + SIDEBAR ===== */}
      {selectedOrgId ? (
        <DashboardProvider>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 rounded-2xl overflow-hidden border border-slate-200 bg-white">
              <VehicleSidebar
                vehicles={visibleVehicles}
                selectedId={selectedVehicleId}
                onSelect={(id) => setSelectedVehicleId(id === selectedVehicleId ? null : id)}
                statusFilter={statusFilter === "all" ? "total" : statusFilter}
              />
            </div>

            <div className="lg:col-span-2 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-130">
              <MapWrapper />
            </div>
          </div>
        </DashboardProvider>
      ) : (
        <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 h-130">
          <OrganizationMap
            organizations={orgPositions}
            vehicles={[]}
            selectedOrgId={null}
            selectedVehicleId={null}
            onOrgSelect={(id: string) => setSelectedOrgId(id)}
          />
        </div>
      )}
    </div>
  );
}

/* =========================
   HELPERS (UNCHANGED)
========================= */
function StatCard({ title, value, icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-600 shadow-blue-200",
    orange: "bg-orange-500 shadow-orange-200",
    green: "bg-green-500 shadow-green-200",
    purple: "bg-purple-600 shadow-purple-200",
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <div className={`p-3 rounded-xl text-white ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">
        {title}
      </p>
      <h3 className="text-2xl font-black text-gray-900">{value}</h3>
    </div>
  );
}
