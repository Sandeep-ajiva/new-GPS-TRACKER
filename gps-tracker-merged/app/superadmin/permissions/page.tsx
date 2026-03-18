"use client";

import { Building2, Car, CheckCircle2, Radio, ShieldCheck, Users, XCircle } from "lucide-react";
import { useGetUsersQuery } from "@/redux/api/usersApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { getCollection } from "@/components/superadmin/superadmin-data";

type RoleKey = "superadmin" | "admin" | "driver" | "viewer";

type ModuleAccess = {
  label: string;
  key: string;
  icon: typeof Building2;
  support: Record<RoleKey, string>;
};

const roleDefinitions: Array<{
  key: RoleKey;
  label: string;
  scope: string;
  description: string;
}> = [
  {
    key: "superadmin",
    label: "Super Admin",
    scope: "Global platform authority",
    description: "Full cross-organization control across organizations, users, vehicles, devices, mappings, and platform configuration surfaces.",
  },
  {
    key: "admin",
    label: "Organization Admin",
    scope: "Organization-level authority",
    description: "Operational control over organization-scoped users, vehicles, devices, and day-to-day administration inside assigned workspace boundaries.",
  },
  {
    key: "driver",
    label: "Driver",
    scope: "Field operations access",
    description: "Limited operational role tied to assigned fleet activity and status visibility, without platform administration permissions.",
  },
  {
    key: "viewer",
    label: "Viewer",
    scope: "Read-only visibility",
    description: "Observation-only access for monitoring and review workflows where editing or platform-wide changes are not required.",
  },
];

const moduleAccess: ModuleAccess[] = [
  {
    key: "organizations",
    label: "Organizations",
    icon: Building2,
    support: {
      superadmin: "Create, update, and globally manage all organizations.",
      admin: "View assigned organization context only.",
      driver: "No direct access.",
      viewer: "No direct access.",
    },
  },
  {
    key: "users",
    label: "Users",
    icon: Users,
    support: {
      superadmin: "Create and manage users across the platform.",
      admin: "Manage users inside assigned organization scope.",
      driver: "Own account visibility only where exposed by the product.",
      viewer: "Read-only visibility where available.",
    },
  },
  {
    key: "vehicles",
    label: "Vehicles",
    icon: Car,
    support: {
      superadmin: "Global vehicle visibility and management.",
      admin: "Manage vehicles inside organization scope.",
      driver: "Assigned vehicle context only.",
      viewer: "Read-only fleet visibility where permitted.",
    },
  },
  {
    key: "gpsDevices",
    label: "GPS Devices",
    icon: Radio,
    support: {
      superadmin: "Global hardware inventory and mapping control.",
      admin: "Manage organization-scoped devices and assignment.",
      driver: "No direct device administration.",
      viewer: "Read-only device visibility where available.",
    },
  },
  {
    key: "platformControls",
    label: "Platform Controls",
    icon: ShieldCheck,
    support: {
      superadmin: "Permissions, settings, and global operational control surfaces.",
      admin: "No superadmin-level platform controls.",
      driver: "No platform control access.",
      viewer: "No platform control access.",
    },
  },
];

const roleOrder: RoleKey[] = ["superadmin", "admin", "driver", "viewer"];

export default function PermissionsPage() {
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery(
    { page: 0, limit: 1000 },
    { refetchOnMountOrArgChange: true },
  );
  const { data: orgData, isLoading: organizationsLoading } = useGetOrganizationsQuery(
    { page: 0, limit: 1000 },
    { refetchOnMountOrArgChange: true },
  );
  const { data: vehiclesData, isLoading: vehiclesLoading } = useGetVehiclesQuery(
    { page: 0, limit: 1000 },
    { refetchOnMountOrArgChange: true },
  );
  const { data: devicesData, isLoading: devicesLoading } = useGetGpsDevicesQuery(
    { page: 0, limit: 1000 },
    { refetchOnMountOrArgChange: true },
  );

  const users = getCollection<{ role?: string }>(usersData, ["users", "data", "docs", "users"]);
  const organizations = getCollection(orgData, ["organizations", "data", "docs", "organizations"]);
  const vehicles = getCollection(vehiclesData, ["vehicles", "data", "docs", "vehicles"]);
  const devices = getCollection(devicesData, ["data", "docs"]);

  const roleCounts = roleOrder.reduce<Record<RoleKey, number>>((accumulator, role) => {
    accumulator[role] = users.filter((user) => user.role === role).length;
    return accumulator;
  }, { superadmin: 0, admin: 0, driver: 0, viewer: 0 });

  const isLoading = usersLoading || organizationsLoading || vehiclesLoading || devicesLoading;

  return (
    <div className="space-y-6 pb-8 sm:space-y-8">
      <section className="rounded-[28px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)] sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Authority Matrix</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-100">Permissions</h1>
            <p className="text-sm font-medium text-slate-400">
              This superadmin view reflects the current platform authority model with real usage counts and role scope. Unsupported demo permission editing has been removed to keep this area operationally honest.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryChip label="Organizations" value={`${organizations.length}`} />
            <SummaryChip label="Users" value={`${users.length}`} />
            <SummaryChip label="Vehicles" value={`${vehicles.length}`} />
            <SummaryChip label="GPS Devices" value={`${devices.length}`} />
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Role Coverage</p>
            <h2 className="text-xl font-black text-slate-100">Supported authority levels</h2>
            <p className="text-sm text-slate-400">
              The dedicated superadmin frontend now reflects only roles that are actively supported by the current product flow.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            {roleDefinitions.map((role) => (
              <div key={role.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-100">{role.label}</p>
                    <p className="mt-1 text-[11px] font-black uppercase tracking-[0.18em] text-emerald-200">{role.scope}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                    {roleCounts[role.key]} active
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-400">{role.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Policy Notes</p>
            <h2 className="text-xl font-black text-slate-100">What changed</h2>
          </div>

          <div className="mt-5 space-y-3">
            <PolicyNote text="Manager has been removed from the dedicated superadmin role controls and authority matrix." />
            <PolicyNote text="This screen no longer presents fake editable permission toggles without backend persistence." />
            <PolicyNote text="Role descriptions below are aligned with the currently exposed frontend routes and operational scope." />
            <PolicyNote text="If a backend permission service is introduced later, this page can become a real editor without changing superadmin navigation structure." />
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-200">Current Status</p>
            <p className="mt-2 text-sm font-medium leading-6 text-emerald-50">
              {isLoading
                ? "Refreshing platform role usage and authority coverage..."
                : "Role coverage and scope summary are now driven by live platform datasets instead of demo permission records."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-800/80 bg-slate-900/65 p-5 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.85)]">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Module Access</p>
          <h2 className="text-xl font-black text-slate-100">Operational authority by module</h2>
          <p className="text-sm text-slate-400">
            This matrix shows the intended access envelope for the supported roles inside the current platform experience.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          {moduleAccess.map((module) => (
            <div key={module.key} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
                  <module.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-100">{module.label}</p>
                  <p className="text-xs text-slate-500">Role-correct scope for the current superadmin product surface</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {roleOrder.map((role) => {
                  const hasAccess = module.support[role] && !module.support[role].toLowerCase().startsWith("no ");
                  return (
                    <div key={`${module.key}-${role}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-300">
                          {roleDefinitions.find((item) => item.key === role)?.label}
                        </p>
                        {hasAccess ? (
                          <CheckCircle2 size={16} className="text-emerald-300" />
                        ) : (
                          <XCircle size={16} className="text-slate-600" />
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-400">{module.support[role]}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-100">{value}</p>
    </div>
  );
}

function PolicyNote({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm font-medium leading-6 text-slate-300">
      {text}
    </div>
  );
}
