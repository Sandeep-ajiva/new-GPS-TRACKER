"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Building2,
  Car,
  Link2,
  Radio,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useGetMeQuery, useGetUsersQuery } from "@/redux/api/usersApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";
import { superAdminNavItems } from "@/components/superadmin/Layout/navigation";
import {
  formatDateTime,
  formatStatus,
  getCollection,
  getDisplayName,
  getInitials,
} from "@/components/superadmin/superadmin-data";

type OrganizationRecord = {
  _id: string;
  name?: string;
  email?: string;
  status?: string;
  createdAt?: string;
};

type UserRecord = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  status?: string;
  createdAt?: string;
};

type VehicleRecord = {
  _id: string;
  vehicleNumber?: string;
  model?: string;
  status?: string;
  createdAt?: string;
};

type DeviceRecord = {
  _id: string;
  imei?: string;
  deviceModel?: string;
  status?: string;
  createdAt?: string;
};

type LiveRecord = {
  movementStatus?: string;
  status?: string;
  currentSpeed?: number;
};

export default function SuperAdminDashboardPage() {
  const { data: meData } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
  const { data: orgData, isLoading: isOrgsLoading } = useGetOrganizationsQuery({ page: 0, limit: 1000 });
  const { data: usersData, isLoading: isUsersLoading } = useGetUsersQuery({ page: 0, limit: 1000 });
  const { data: vehiclesData, isLoading: isVehiclesLoading } = useGetVehiclesQuery({ page: 0, limit: 1000 });
  const { data: devicesData, isLoading: isDevicesLoading } = useGetGpsDevicesQuery({ page: 0, limit: 1000 });
  const { data: liveData, isLoading: isLiveLoading } = useGetLiveVehiclesQuery(undefined);

  const me = meData?.data;
  const displayName = getDisplayName(me);
  const initials = getInitials(displayName);

  const organizations = useMemo(
    () => getCollection<OrganizationRecord>(orgData, ["data", "docs", "organizations"]),
    [orgData],
  );
  const users = useMemo(
    () => getCollection<UserRecord>(usersData, ["data", "docs", "users"]),
    [usersData],
  );
  const vehicles = useMemo(
    () => getCollection<VehicleRecord>(vehiclesData, ["data", "docs", "vehicles"]),
    [vehiclesData],
  );
  const devices = useMemo(
    () => getCollection<DeviceRecord>(devicesData, ["data", "docs"]),
    [devicesData],
  );
  const liveVehicles = useMemo(
    () => getCollection<LiveRecord>(liveData, ["data", "docs"]),
    [liveData],
  );

  const onlineVehicles = useMemo(
    () =>
      liveVehicles.filter((item) => {
        const status = (item.movementStatus || item.status || "").toLowerCase();
        return status === "moving" || status === "running" || status === "online" || (item.currentSpeed || 0) > 0;
      }).length,
    [liveVehicles],
  );

  const activeOrganizations = useMemo(
    () => organizations.filter((item) => (item.status || "").toLowerCase() === "active").length,
    [organizations],
  );

  const activeUsers = useMemo(
    () => users.filter((item) => (item.status || "").toLowerCase() === "active").length,
    [users],
  );

  const recentOrganizations = useMemo(() => organizations.slice(0, 5), [organizations]);
  const recentUsers = useMemo(() => users.slice(0, 5), [users]);
  const recentVehicles = useMemo(() => vehicles.slice(0, 5), [vehicles]);

  const isLoading = isOrgsLoading || isUsersLoading || isVehiclesLoading || isDevicesLoading || isLiveLoading;

  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.85)] sm:p-6 lg:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-[0.34em] text-emerald-400/70">Platform Authority</p>
            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tight text-slate-50 sm:text-4xl">SuperAdmin Console</h1>
              <p className="max-w-3xl text-sm font-medium leading-6 text-slate-400">
                Global control across organizations, users, vehicles, GPS devices, mappings, permissions, and platform settings.
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-4 rounded-[24px] border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-lg font-black text-slate-950">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-50">{displayName}</p>
              <p className="truncate text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
                {formatStatus(me?.role || "superadmin")}
              </p>
              <p className="truncate text-xs text-slate-400">{me?.email || "Global platform access"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Organizations" value={organizations.length} helper={`${activeOrganizations} active`} icon={Building2} />
        <StatCard title="Users" value={users.length} helper={`${activeUsers} active`} icon={Users} />
        <StatCard title="Vehicles" value={vehicles.length} helper="Global fleet visibility" icon={Car} />
        <StatCard title="GPS Devices" value={devices.length} helper="Hardware tracked" icon={Radio} />
        <StatCard title="Online Vehicles" value={onlineVehicles} helper="From live telemetry" icon={Activity} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard
            title="Quick Actions"
            description="Jump directly into the highest-authority tasks of the platform."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {superAdminNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-emerald-500/25 hover:bg-slate-950"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
                    <item.icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-100">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{item.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent Organizations"
            description="Latest global organizations visible to the superadmin."
            actionHref="/superadmin/organizations"
          >
            <RecordList
              items={recentOrganizations.map((item) => ({
                title: item.name || "Organization",
                meta: [item.email || "No email", formatStatus(item.status)].filter(Boolean).join(" • "),
                extra: formatDateTime(item.createdAt) || "Recently created",
              }))}
              emptyLabel={isLoading ? "Loading organizations..." : "No organizations available yet."}
            />
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="Recent Users"
            description="Newest platform user records across all organizations."
            actionHref="/superadmin/users"
          >
            <RecordList
              items={recentUsers.map((item) => ({
                title: [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || item.email || "User",
                meta: [formatStatus(item.role), item.email || ""].filter(Boolean).join(" • "),
                extra: formatDateTime(item.createdAt) || "Recently created",
              }))}
              emptyLabel={isLoading ? "Loading users..." : "No users available yet."}
            />
          </SectionCard>

          <SectionCard
            title="Fleet Snapshot"
            description="Latest visible vehicle records and operational context."
            actionHref="/superadmin/vehicles"
          >
            <RecordList
              items={recentVehicles.map((item) => ({
                title: item.vehicleNumber || "Vehicle",
                meta: [item.model || "", formatStatus(item.status)].filter(Boolean).join(" • "),
                extra: formatDateTime(item.createdAt) || "Recently updated",
              }))}
              emptyLabel={isLoading ? "Loading vehicles..." : "No vehicles available yet."}
            />
          </SectionCard>

          <SectionCard
            title="Platform Control Areas"
            description="High-impact superadmin sections that should remain role-correct and operational."
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <AuthorityCard
                icon={Link2}
                title="Device Mapping"
                description="Control hardware assignment across all organizations."
                href="/superadmin/device-mapping"
              />
              <AuthorityCard
                icon={Settings}
                title="Settings"
                description="Platform-level system and environment context."
                href="/superadmin/settings"
              />
              <AuthorityCard
                icon={ShieldCheck}
                title="Permissions"
                description="Review supported authority levels and access scope."
                href="/superadmin/permissions"
              />
            </div>
          </SectionCard>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  helper,
  icon: Icon,
}: {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.28em] text-slate-500">{title}</p>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
          <Icon size={18} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-50">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-400">{helper}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
  actionHref,
}: {
  title: string;
  description: string;
  children: ReactNode;
  actionHref?: string;
}) {
  return (
    <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
      <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-black text-slate-50">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-slate-400">{description}</p>
        </div>
        {actionHref ? (
          <Link
            href={actionHref}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-200 transition hover:text-emerald-100"
          >
            Open
            <ArrowRight size={14} />
          </Link>
        ) : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function RecordList({
  items,
  emptyLabel,
}: {
  items: Array<{ title: string; meta: string; extra: string }>;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm font-medium text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={`${item.title}-${item.extra}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm font-black text-slate-100">{item.title}</p>
          <p className="mt-1 text-xs font-medium text-slate-400">{item.meta}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{item.extra}</p>
        </div>
      ))}
    </div>
  );
}

function AuthorityCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
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
    </Link>
  );
}
