"use client";

import Link from "next/link";
import { ArrowRight, Building2, Car, Radio, Settings, ShieldCheck, Users } from "lucide-react";
import { useGetMeQuery, useGetUsersQuery } from "@/redux/api/usersApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { formatDateTime, getCollection, getDisplayName } from "@/components/superadmin/superadmin-data";

export default function SettingsPage() {
  const { data: meData } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: orgData } = useGetOrganizationsQuery({ page: 0, limit: 1000 });
  const { data: usersData } = useGetUsersQuery({ page: 0, limit: 1000 });
  const { data: vehiclesData } = useGetVehiclesQuery({ page: 0, limit: 1000 });
  const { data: devicesData } = useGetGpsDevicesQuery({ page: 0, limit: 1000 });

  const me = meData?.data;
  const organizations = getCollection(orgData, ["data", "docs", "organizations"]);
  const users = getCollection(usersData, ["data", "docs", "users"]);
  const vehicles = getCollection(vehiclesData, ["data", "docs", "vehicles"]);
  const devices = getCollection(devicesData, ["data", "docs"]);

  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Platform Controls</p>
        <h1 className="text-3xl font-black tracking-tight text-slate-100">Settings</h1>
        <p className="max-w-3xl text-sm font-medium text-slate-400">
          Superadmin-level platform control surface. This page now shows real system context and directs you to operational settings areas instead of fake saved state.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Authority Context</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <InfoCard label="Signed-in user" value={getDisplayName(me)} />
            <InfoCard label="Role" value="Superadmin" />
            <InfoCard label="Organizations visible" value={`${organizations.length}`} />
            <InfoCard label="Users visible" value={`${users.length}`} />
            <InfoCard label="Vehicles visible" value={`${vehicles.length}`} />
            <InfoCard label="GPS devices visible" value={`${devices.length}`} />
            <InfoCard label="Last profile update" value={formatDateTime(me?.updatedAt) || "Unavailable"} />
            <InfoCard label="Email" value={me?.email || "Unavailable"} />
          </div>
        </section>

        <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Platform Notes</p>
          <div className="mt-4 space-y-3">
            <NoteCard text="Platform-wide writable settings are not backed by a dedicated settings API in the current frontend, so this screen avoids fake save actions." />
            <NoteCard text="Use the linked operational sections below to manage the live platform state that is already connected to backend data." />
            <NoteCard text="Legacy demo-style system controls were removed from this page to keep superadmin settings honest and production-safe." />
          </div>
        </section>
      </div>

      <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Operational Settings Areas</p>
          <h2 className="text-xl font-black text-slate-100">Open the right control surface</h2>
          <p className="text-sm text-slate-400">
            These routes are already connected to real data and reflect the active platform state.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <SettingsLink href="/superadmin/organizations" icon={Building2} title="Organizations" description="Create, update, and globally manage organizations." />
          <SettingsLink href="/superadmin/users" icon={Users} title="Users" description="Manage platform-wide user records and org assignment." />
          <SettingsLink href="/superadmin/vehicles" icon={Car} title="Vehicles" description="Review and manage fleet assets globally." />
          <SettingsLink href="/superadmin/gps-devices" icon={Radio} title="GPS Devices" description="Control hardware inventory and assignments." />
          <SettingsLink href="/superadmin/device-mapping" icon={Settings} title="Device Mapping" description="Map devices to vehicles using the live mapping flow." />
          <SettingsLink href="/superadmin/permissions" icon={ShieldCheck} title="Permissions" description="Review supported authority levels and access scope." />
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function NoteCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm font-medium leading-6 text-slate-300">
      {text}
    </div>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Settings;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-emerald-500/25 hover:bg-slate-950"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
        <Icon size={18} />
      </div>
      <p className="mt-3 text-sm font-black text-slate-100">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
      <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">
        Open
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}
