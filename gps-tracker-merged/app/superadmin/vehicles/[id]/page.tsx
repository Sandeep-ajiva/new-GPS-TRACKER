"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";

const orgs = [
  {
    id: "org_ajiva",
    name: "Ajiva Tracker",
    position: { lat: 28.6329, lng: 77.2195 },
  },
  {
    id: "org_north",
    name: "North Branch",
    position: { lat: 30.7333, lng: 76.7794 },
  },
];

const vehicles = [
  {
    id: "veh_1",
    orgId: "org_ajiva",
    label: "DL 10CK1840",
    driverName: "Dave Mathew",
    speed: 46,
    lastUpdated: "2m ago",
    location: "Connaught Place, Delhi",
    status: "running",
    position: { lat: 28.6312, lng: 77.2167 },
  },
  {
    id: "veh_2",
    orgId: "org_north",
    label: "PB 10AX2234",
    driverName: "Mitchell John",
    speed: 12,
    lastUpdated: "1m ago",
    location: "Sector 17, Chandigarh",
    status: "idle",
    position: { lat: 30.7394, lng: 76.7752 },
  },
  {
    id: "veh_3",
    orgId: "org_ajiva",
    label: "DL 10CK1900",
    driverName: "Ritika Nair",
    speed: 38,
    lastUpdated: "4m ago",
    location: "Laxmi Nagar, Delhi",
    status: "running",
    position: { lat: 28.6402, lng: 77.2851 },
  },
];

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const vehicle = vehicles.find((item) => item.id === params.id);
  const org = orgs.find((item) => item.id === vehicle?.orgId);

  const orgPoints = useMemo(
    () =>
      org
        ? [
            {
              id: org.id,
              name: org.name,
              position: org.position,
            },
          ]
        : [],
    [org]
  );

  const vehiclePoints = useMemo(
    () =>
      vehicle
        ? [
            {
              id: `${vehicle.orgId}:${vehicle.id}`,
              status: vehicle.status,
              position: vehicle.position,
              label: vehicle.label,
              driverName: vehicle.driverName,
              speed: vehicle.speed,
              lastUpdated: vehicle.lastUpdated,
              location: vehicle.location,
            },
          ]
        : [],
    [vehicle]
  );

  if (!vehicle || !org) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-slate-300">
        Vehicle not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Vehicle</p>
          <h1 className="text-2xl font-black text-slate-100">{vehicle.label}</h1>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Details</p>
            <h2 className="text-lg font-black text-slate-100">{vehicle.label}</h2>
            <p className="text-sm text-slate-400">Org: {org.name}</p>
            <div className="mt-4 grid gap-3 text-xs text-slate-300">
              <InfoItem label="Driver" value={vehicle.driverName} />
              <InfoItem label="Speed" value={`${vehicle.speed} km/h`} />
              <InfoItem label="Last Updated" value={vehicle.lastUpdated} />
              <InfoItem label="Location" value={vehicle.location} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Telemetry</p>
            <div className="mt-4 space-y-2 text-xs text-slate-400">
              <p>Engine: Online</p>
              <p>Battery: 87%</p>
              <p>Ignition: Active</p>
            </div>
          </div>
        </div>
        <div className="h-[520px] rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
          <OrganizationMap
            organizations={orgPoints}
            vehicles={vehiclePoints}
            selectedOrgId={org.id}
            selectedVehicleId={`${vehicle.orgId}:${vehicle.id}`}
          />
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
