"use client";

import { useMemo, useState } from "react";
import { Activity, Car, ExternalLink, Plus, Radio, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import OrganizationCreateModal from "@/components/admin/Modals/OrganizationCreateModal";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";

interface ApiOrg {
  _id: string;
  name: string;
  address?: {
    city?: string;
    state?: string;
  };
  adminUser?: string;
  email: string;
  phone: string;
  status: string;
  geo?: {
    lat?: number;
    lng?: number;
  };
}

interface ApiVehicle {
  _id: string;
  organizationId: string;
  vehicleNumber: string;
  driverId?: string;
}

interface ApiLiveDataItem {
  vehicleId?: { _id: string } | string;
  currentSpeed?: number;
  updatedAt?: string;
  currentLocation?: string;
  movementStatus?: string;
  latitude?: number;
  longitude?: number;
}

type BranchRecord = {
  id: string;
  name: string;
  address: string;
  manager: string;
  status: "active" | "paused";
  position: { lat: number; lng: number };
};

type OrgRecord = {
  id: string;
  name: string;
  address: string;
  adminId: string;
  adminName: string;
  email: string;
  phone: string;
  status: "active" | "paused";
  position: { lat: number; lng: number };
  branches: BranchRecord[];
};

type VehicleRecord = {
  id: string;
  orgId: string;
  branchId?: string;
  label: string;
  driverName: string;
  driverId: string;
  speed: number;
  lastUpdated: string;
  location: string;
  status: "running" | "idle" | "stopped";
  position: { lat: number; lng: number };
};

export default function DashboardPage() {
  const router = useRouter();
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const { data: orgsData, isLoading: isOrgsLoading } = useGetOrganizationsQuery({});
  const { data: vehiclesData, isLoading: isVehiclesLoading } = useGetVehiclesQuery({});
  const { data: devicesData, isLoading: isDevicesLoading } = useGetGpsDevicesQuery({});
  const { data: liveData, isLoading: isLiveLoading } = useGetLiveVehiclesQuery({});

  const orgs: OrgRecord[] = useMemo(() => {
    if (!orgsData?.docs) return [];
    return orgsData.docs.map((org: ApiOrg) => ({
      id: org._id,
      name: org.name,
      address: org.address ? `${org.address.city || ''}, ${org.address.state || ''}` : "N/A",
      adminId: org.adminUser || "N/A",
      adminName: "Admin", // Should be fetched or populated
      email: org.email,
      phone: org.phone,
      status: org.status === "active" ? "active" : "paused",
      position: { lat: org.geo?.lat || 28.6139, lng: org.geo?.lng || 77.2090 },
      branches: [], // Nested branches not currently returned by API
    }));
  }, [orgsData]);

  const vehicles: VehicleRecord[] = useMemo(() => {
    if (!vehiclesData?.docs) return [];

    // Create a map of live data by vehicleId for quick lookup
    const liveDataMap = new Map();
    if (liveData?.data) {
      liveData.data.forEach((item: ApiLiveDataItem) => {
        if (item.vehicleId) {
          const vId = typeof item.vehicleId === 'string' ? item.vehicleId : item.vehicleId._id;
          liveDataMap.set(vId, item);
        }
      });
    }

    return vehiclesData.docs.map((vehicle: ApiVehicle) => {
      const liveInfo = liveDataMap.get(vehicle._id);
      return {
        id: vehicle._id,
        orgId: vehicle.organizationId,
        branchId: undefined, // Branch logic needed
        label: vehicle.vehicleNumber,
        driverName: "Unknown Driver", // Not populated
        driverId: vehicle.driverId || "N/A",
        speed: liveInfo?.currentSpeed || 0,
        lastUpdated: liveInfo?.updatedAt ? new Date(liveInfo.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Recently",
        location: liveInfo?.currentLocation || "Location Unavailable",
        status: liveInfo?.movementStatus === "moving" ? "running" : (liveInfo?.movementStatus || "stopped"),
        position: { lat: liveInfo?.latitude || 28.6139, lng: liveInfo?.longitude || 77.2090 },
      };
    });
  }, [vehiclesData, liveData]);

  const devices = useMemo(() => {
    if (!devicesData?.docs) return [];
    return devicesData.docs;
  }, [devicesData]);

  const orgPoints = useMemo(
    () =>
      orgs.map((org) => ({
        id: org.id,
        name: org.name,
        position: org.position,
      })),
    [orgs]
  );

  const vehiclePoints = useMemo(
    () =>
      vehicles.map((vehicle) => ({
        id: vehicle.id,
        status: vehicle.status as any,
        position: vehicle.position,
        label: vehicle.label,
        driverName: vehicle.driverName,
        speed: vehicle.speed,
        lastUpdated: vehicle.lastUpdated,
        location: vehicle.location,
      })),
    [vehicles]
  );

  const displayLiveData = vehicles.map((vehicle) => ({ status: vehicle.status }));
  const onlineVehicles = displayLiveData.filter((v) => v.status === "running").length;
  // const offlineVehicles = vehicles.length - onlineVehicles;

  const selectedOrg = orgs.find((org) => org.id === selectedOrgId) || null;
  const selectedBranches = selectedOrg ? selectedOrg.branches : [];
  const selectedOrgVehicles = vehicles.filter((vehicle) => vehicle.orgId === selectedOrgId);

  const handleSelectOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    setSelectedVehicleId(null);
  };

  if (isOrgsLoading || isVehiclesLoading || isDevicesLoading || isLiveLoading) {
    return <div className="p-10 text-center text-slate-400">Loading Dashboard...</div>;
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-emerald-400/70">Command</p>
          <h1 className="text-3xl font-black text-slate-100 tracking-tight">SuperAdmin Console</h1>
          <p className="mt-2 text-sm text-slate-400">Track org performance before drilling into live fleets.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => setIsOrgModalOpen(true)}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
          >
            <Plus className="h-4 w-4" />
            Add Organization
          </button>
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            System Live
          </div>
        </div>
      </div>

      <OrganizationCreateModal
        isOpen={isOrgModalOpen}
        onClose={() => setIsOrgModalOpen(false)}
        variant="dark"
        onCreate={() => {
          // Ideally should call createOrganization mutation here
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Organizations" value={orgs.length} icon={<Users size={20} />} color="blue" />
        <StatCard title="Total Vehicles" value={vehicles.length} icon={<Car size={20} />} color="orange" />
        <StatCard title="GPS Devices" value={devices.length} icon={<Radio size={20} />} color="purple" />
        <StatCard title="Online Vehicles" value={onlineVehicles} icon={<Activity size={20} />} color="green" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Organizations</p>
                <h2 className="text-lg font-black text-slate-100">Admin-Owned Orgs</h2>
              </div>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                {orgs.length} active
              </span>
            </div>
          </div>
          <div className="space-y-3 h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {orgs.map((org) => {
              const vehicleCount = vehicles.filter((vehicle) => vehicle.orgId === org.id).length;
              const isActive = org.id === selectedOrgId;
              return (
                <div
                  key={org.id}
                  onClick={() => handleSelectOrg(org.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      handleSelectOrg(org.id);
                    }
                  }}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${isActive
                      ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                      : "border-slate-800/80 bg-slate-900/60 text-slate-200 hover:border-emerald-500/20"
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black">{org.adminName}</p>
                      <p className="text-xs text-slate-400">{org.name}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${org.status === "active" ? "text-emerald-300" : "text-amber-300"
                      }`}>
                      {org.status}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                    <span>{vehicleCount} vehicles</span>
                    <span>Admin ID: {org.adminId}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    <span>Open Admin Console</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (typeof window !== "undefined") {
                          sessionStorage.setItem("adminSelectedOrgId", org.id);
                          sessionStorage.setItem("adminFromSuperadmin", "true");
                        }
                        router.push("/admin");
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/30"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            {selectedOrg ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Selected Organization</p>
                    <h2 className="text-xl font-black text-slate-100">{selectedOrg.name}</h2>
                    <p className="text-sm text-slate-400">{selectedOrg.address}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    {selectedOrg.status}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-3 text-xs text-slate-300">
                  <InfoItem label="Admin" value={selectedOrg.adminName} />
                  <InfoItem label="Contact" value={selectedOrg.phone} />
                  <InfoItem label="Email" value={selectedOrg.email} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-800/80 bg-slate-950/60 px-4 py-3 text-xs text-slate-300">
                  <span>Jump to the org admin dashboard for full operational controls.</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        sessionStorage.setItem("adminSelectedOrgId", selectedOrg.id);
                        sessionStorage.setItem("adminFromSuperadmin", "true");
                      }
                      router.push("/admin");
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200 hover:bg-emerald-500/30"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    View Admin Dashboard
                  </button>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Branches</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedBranches.map((branch) => (
                      <div
                        key={branch.id}
                        className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-sm text-slate-200"
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-black">{branch.name}</p>
                          <span className="text-[10px] uppercase tracking-widest text-slate-400">
                            {branch.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{branch.address}</p>
                        <p className="text-xs text-slate-500">Manager: {branch.manager}</p>
                      </div>
                    ))}
                    {selectedBranches.length === 0 && (
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-xs text-slate-400">
                        No branches added yet.
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Vehicles</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedOrgVehicles.map((vehicle) => {
                      const active = vehicle.id === selectedVehicleId;
                      return (
                        <button
                          key={vehicle.id}
                          onClick={() => setSelectedVehicleId(vehicle.id)}
                          className={`rounded-xl border px-4 py-3 text-left transition ${active
                              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                              : "border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-emerald-500/20"
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-black">{vehicle.label}</p>
                            <span className="text-[10px] uppercase tracking-widest text-slate-400">
                              {vehicle.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400">Driver: {vehicle.driverName}</p>
                          <p className="text-xs text-slate-500">Speed {vehicle.speed} km/h · {vehicle.lastUpdated}</p>
                          <p className="text-[10px] uppercase tracking-widest text-slate-500">Driver ID: {vehicle.driverId}</p>
                        </button>
                      );
                    })}
                    {selectedOrgVehicles.length === 0 && (
                      <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-xs text-slate-400">
                        No vehicles assigned yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Select an organization</p>
                <p className="mt-2 text-sm">Pick an organization to reveal its overview and live map.</p>
              </div>
            )}
          </div>

          <div className="h-105 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            {selectedOrg ? (
              <OrganizationMap
                organizations={orgPoints}
                secondaryOrganizations={selectedBranches.map((branch) => ({
                  id: branch.id,
                  name: branch.name,
                  position: branch.position,
                }))}
                vehicles={vehiclePoints}
                selectedOrgId={selectedOrgId}
                selectedVehicleId={selectedVehicleId || undefined}
                onOrgSelect={handleSelectOrg}
                onVehicleSelect={(vehicleId) => setSelectedVehicleId(vehicleId || null)}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">
                Map appears after you select an organization.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number | string; icon: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
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

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}
