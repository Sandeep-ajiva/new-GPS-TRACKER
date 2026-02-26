"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";

const orgs = [
  {
    id: "org_ajiva",
    name: "Ajiva Tracker",
    address: "24 Connaught Place, New Delhi",
    admin: "Diana Kapoor",
    email: "admin@ajiva.com",
    phone: "+91 98765 43210",
    status: "active",
    position: { lat: 28.6329, lng: 77.2195 },
    branches: [
      {
        id: "org_ajiva_br_1",
        name: "Ajiva East Branch",
        address: "Laxmi Nagar, Delhi",
        manager: "Sahil Verma",
        status: "active",
        position: { lat: 28.6412, lng: 77.2863 },
      },
      {
        id: "org_ajiva_br_2",
        name: "Ajiva South Branch",
        address: "Saket, Delhi",
        manager: "Neha Rao",
        status: "paused",
        position: { lat: 28.5244, lng: 77.2066 },
      },
    ],
  },
  {
    id: "org_north",
    name: "North Branch",
    address: "Sector 17, Chandigarh",
    admin: "Rohan Singh",
    email: "north@ajiva.com",
    phone: "+91 98765 43211",
    status: "active",
    position: { lat: 30.7333, lng: 76.7794 },
    branches: [
      {
        id: "org_north_br_1",
        name: "North Logistics Hub",
        address: "Industrial Area, Chandigarh",
        manager: "Kunal Kapoor",
        status: "active",
        position: { lat: 30.7112, lng: 76.806 },
      },
    ],
  },
];

const vehicles = [
  {
    id: "org_ajiva:veh_1",
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
    id: "org_north:veh_1",
    orgId: "org_north",
    label: "PB 10AX2234",
    driverName: "Mitchell John",
    speed: 12,
    lastUpdated: "1m ago",
    location: "Sector 17, Chandigarh",
    status: "idle",
    position: { lat: 30.7394, lng: 76.7752 },
  },
];

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const org = orgs.find((item) => item.id === params.id);
  const orgVehicles = vehicles.filter((vehicle) => vehicle.orgId === params.id);
  const orgBranches = org?.branches ?? [];

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
      orgVehicles.map((vehicle) => ({
        id: vehicle.id,
        status: vehicle.status as any,
        position: vehicle.position,
        label: vehicle.label,
        driverName: vehicle.driverName,
        speed: vehicle.speed,
        lastUpdated: vehicle.lastUpdated,
        location: vehicle.location,
      })),
    [orgVehicles]
  );

  if (!org) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 text-slate-300">
        Organization not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Organization</p>
          <h1 className="text-2xl font-black text-slate-100">{org.name}</h1>
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
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Details</p>
            <h2 className="text-lg font-black text-slate-100">{org.name}</h2>
            <p className="text-sm text-slate-400">{org.address}</p>
            <div className="mt-4 grid gap-3 text-xs text-slate-300">
              <InfoItem label="Admin" value={org.admin} />
              <InfoItem label="Contact" value={org.phone} />
              <InfoItem label="Email" value={org.email} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Branches</p>
            <div className="mt-4 space-y-3">
              {orgBranches.map((branch) => (
                <div key={branch.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 text-sm text-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="font-black">{branch.name}</p>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">{branch.status}</span>
                  </div>
                  <p className="text-xs text-slate-400">{branch.address}</p>
                  <p className="text-xs text-slate-500">Manager: {branch.manager}</p>
                </div>
              ))}
              {orgBranches.length === 0 && (
                <p className="text-xs text-slate-400">No branches assigned yet.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Vehicles</p>
            <div className="mt-4 space-y-3">
              {orgVehicles.map((vehicle) => {
                const isActive = selectedVehicleId === vehicle.id;
                return (
                  <button
                    key={vehicle.id}
                    onClick={() => setSelectedVehicleId(vehicle.id)}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition ${isActive
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-100"
                        : "border-slate-800/80 bg-slate-950/60 text-slate-200 hover:border-emerald-500/20"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-black">{vehicle.label}</p>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">
                        {vehicle.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Driver: {vehicle.driverName}</p>
                    <p className="text-xs text-slate-500">
                      Speed {vehicle.speed} km/h · {vehicle.lastUpdated}
                    </p>
                  </button>
                );
              })}
              {orgVehicles.length === 0 && (
                <p className="text-xs text-slate-400">No vehicles assigned yet.</p>
              )}
            </div>
          </div>
        </div>
        <div className="h-[520px] rounded-2xl border border-slate-800/80 bg-slate-900/60 p-1 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
          <OrganizationMap
            organizations={orgPoints}
            secondaryOrganizations={orgBranches.map((branch) => ({
              id: branch.id,
              name: branch.name,
              position: branch.position,
            }))}
            vehicles={vehiclePoints}
            selectedOrgId={org.id}
            selectedVehicleId={selectedVehicleId || undefined}
            onVehicleSelect={(vehicleId) => setSelectedVehicleId(vehicleId || null)}
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
