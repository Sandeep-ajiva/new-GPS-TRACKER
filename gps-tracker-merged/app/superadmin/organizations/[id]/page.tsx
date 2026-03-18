"use client";

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import OrganizationMap from "@/components/admin/Map/OrganizationMap";
import { useGetOrganizationQuery } from "@/redux/api/organizationApi";
import { formatDateTime, formatStatus } from "@/components/superadmin/superadmin-data";

type Coordinates = { lat: number; lng: number };

export default function OrganizationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const organizationId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const { data, isLoading, isError } = useGetOrganizationQuery(organizationId, {
    skip: !organizationId,
    refetchOnMountOrArgChange: true,
  });

  const organization = useMemo(() => {
    if (!data || typeof data !== "object") return null;
    if ("data" in data && data.data && typeof data.data === "object") return data.data as Record<string, unknown>;
    return data as Record<string, unknown>;
  }, [data]);

  const position = useMemo(() => getCoordinates(organization), [organization]);
  const organizationPoint = useMemo(
    () =>
      position && organizationId
        ? [
            {
              id: organizationId,
              name: readString(organization?.name) || "Organization",
              position,
            },
          ]
        : [],
    [organization, organizationId, position],
  );

  if (isLoading) {
    return <StateCard text="Loading organization details..." />;
  }

  if (isError || !organization) {
    return <StateCard text="Organization details are unavailable." danger />;
  }

  const name = readString(organization.name) || "Organization";
  const email = readString(organization.email);
  const phone = readString(organization.phone);
  const status = formatStatus(readString(organization.status) || "unknown");
  const address = formatAddress(organization.address);
  const adminName = getAdminName(organization);
  const createdAt = formatDateTime(readString(organization.createdAt));
  const updatedAt = formatDateTime(readString(organization.updatedAt));

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Organization Detail</p>
          <h1 className="text-2xl font-black text-slate-100 sm:text-3xl">{name}</h1>
          <p className="max-w-2xl text-sm text-slate-400">
            Superadmin view of organization identity, contact data, and available location context.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-200 transition hover:bg-slate-900"
        >
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Identity</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoItem label="Organization" value={name} />
              <InfoItem label="Status" value={status} />
              <InfoItem label="Email" value={email || "Unavailable"} />
              <InfoItem label="Phone" value={phone || "Unavailable"} />
              <InfoItem label="Primary Admin" value={adminName || "Unavailable"} />
              <InfoItem label="Created" value={createdAt || "Unavailable"} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Operational Context</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoItem label="Last Updated" value={updatedAt || "Unavailable"} />
              <InfoItem label="Organization ID" value={readString(organization._id) || organizationId || "Unavailable"} />
            </div>
            <div className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Address</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{address || "Address details are unavailable."}</p>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
          <div className="mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location</p>
            <p className="mt-1 text-sm text-slate-400">
              Map renders only when valid organization coordinates are available from the current backend response.
            </p>
          </div>

          {position ? (
            <div className="h-[420px] overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/60">
              <OrganizationMap organizations={organizationPoint} selectedOrgId={organizationId} />
            </div>
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-6 text-center text-sm font-medium leading-6 text-slate-400">
              Location coordinates are not available for this organization, so the map has been hidden instead of showing demo data.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function StateCard({ text, danger = false }: { text: string; danger?: boolean }) {
  return (
    <div className={`rounded-2xl border p-8 text-sm font-semibold ${danger ? "border-rose-500/30 bg-rose-500/10 text-rose-100" : "border-slate-800/80 bg-slate-900/60 text-slate-300"}`}>
      {text}
    </div>
  );
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "";
}

function formatAddress(address: unknown) {
  if (typeof address === "string" && address.trim()) return address;
  if (!address || typeof address !== "object") return "";

  const source = address as Record<string, unknown>;
  return [
    readString(source.addressLine),
    readString(source.city),
    readString(source.state),
    readString(source.country),
    readString(source.pincode),
  ]
    .filter(Boolean)
    .join(", ");
}

function getAdminName(organization: Record<string, unknown> | null) {
  if (!organization) return "";

  const directAdmin = organization.adminUser;
  if (directAdmin && typeof directAdmin === "object") {
    const admin = directAdmin as Record<string, unknown>;
    const fullName = [readString(admin.firstName), readString(admin.lastName)].filter(Boolean).join(" ").trim();
    return fullName || readString(admin.name) || readString(admin.email);
  }

  return readString(organization.adminUser);
}

function getCoordinates(source: Record<string, unknown> | null): Coordinates | null {
  if (!source) return null;

  const candidates: Array<Record<string, unknown>> = [];

  if (source.geo && typeof source.geo === "object") candidates.push(source.geo as Record<string, unknown>);
  if (source.location && typeof source.location === "object") candidates.push(source.location as Record<string, unknown>);
  candidates.push(source);

  for (const candidate of candidates) {
    const lat = readNumber(candidate.lat ?? candidate.latitude);
    const lng = readNumber(candidate.lng ?? candidate.longitude ?? candidate.lon);

    if (lat !== null && lng !== null) {
      return { lat, lng };
    }
  }

  return null;
}

function readNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
