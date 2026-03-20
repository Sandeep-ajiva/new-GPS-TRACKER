"use client";

import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { formatDateTime, formatStatus } from "@/components/superadmin/superadmin-data";
import { getApiErrorMessage } from "@/utils/apiError";
import SimpleModal from "./SimpleModal";

export const EMPTY_VALUE = "—";

export type DetailField = {
  label: string;
  value: ReactNode;
};

type DetailSectionProps = {
  icon: ReactNode;
  title: string;
  fields: DetailField[];
};

type DetailModalFrameProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  children: ReactNode;
};

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

export const unwrapDataRecord = (value: unknown): Record<string, unknown> | null => {
  const root = asRecord(value);
  if (!root) return null;

  const nested = asRecord(root.data);
  return nested ?? root;
};

export const hasOwn = (value: unknown, key: string) =>
  value !== null &&
  value !== undefined &&
  Object.prototype.hasOwnProperty.call(value, key);

export const hasValue = (value: unknown) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

export const readText = (value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || EMPTY_VALUE;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return EMPTY_VALUE;
};

export const pickFirstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = readText(value);
    if (text !== EMPTY_VALUE) {
      return text;
    }
  }

  return EMPTY_VALUE;
};

export const formatDateValue = (value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    return formatDateTime(value) || EMPTY_VALUE;
  }

  if (value instanceof Date) {
    return formatDateTime(value.toISOString()) || EMPTY_VALUE;
  }

  return EMPTY_VALUE;
};

export const formatBooleanLabel = (
  value: unknown,
  trueLabel = "Yes",
  falseLabel = "No",
) => {
  if (value === true) return trueLabel;
  if (value === false) return falseLabel;
  return EMPTY_VALUE;
};

export const getFullName = (value: unknown) => {
  const record = asRecord(value);
  if (!record) return EMPTY_VALUE;

  const name = [readText(record.firstName), readText(record.lastName)]
    .filter((part) => part !== EMPTY_VALUE)
    .join(" ")
    .trim();

  return name || EMPTY_VALUE;
};

export const getEntityLabel = (value: unknown, ...fallbacks: unknown[]) => {
  if (typeof value === "string") {
    return value.trim() || EMPTY_VALUE;
  }

  const record = asRecord(value);
  if (!record) {
    return pickFirstText(...fallbacks);
  }

  return pickFirstText(
    getFullName(record),
    record.name,
    record.vehicleNumber,
    record.registrationNumber,
    record.plateNumber,
    record.imei,
    record.deviceModel,
    record.email,
    record.phone,
    record.licenseNumber,
    record.path,
    record._id,
    ...fallbacks,
  );
};

export const formatAddressValue = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim() || EMPTY_VALUE;
  }

  const record = asRecord(value);
  if (!record) {
    return EMPTY_VALUE;
  }

  const parts = [
    readText(record.addressLine),
    readText(record.city),
    readText(record.state),
    readText(record.country),
    readText(record.pincode),
  ].filter((part) => part !== EMPTY_VALUE);

  return parts.length ? parts.join(", ") : EMPTY_VALUE;
};

export const getStatusTone = (value: unknown) => {
  const normalized = readText(value).toLowerCase();

  if (["active", "online", "enabled", "yes"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["inactive", "offline", "disabled", "no", "blocked"].includes(normalized)) {
    return normalized === "blocked"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-slate-100 text-slate-700";
  }

  if (["maintenance", "decommissioned"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
};

export const renderBadge = (label: string, tone = getStatusTone(label)) => (
  <span
    className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${tone}`}
  >
    {label}
  </span>
);

export const toStatusLabel = (value: unknown, fallback = "Unknown") => {
  const text = readText(value);
  return text === EMPTY_VALUE ? fallback : formatStatus(text);
};

export function DetailSection({ icon, title, fields }: DetailSectionProps) {
  if (!fields.length) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
              {field.label}
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DetailModalFrame({
  isOpen,
  onClose,
  title,
  isLoading,
  isError,
  error,
  onRetry,
  children,
}: DetailModalFrameProps) {
  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title={title} size="large">
      <div className="max-h-[calc(100vh-10rem)] space-y-4 overflow-y-auto pr-1">
        {isLoading ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm font-semibold">Loading details from backend...</p>
          </div>
        ) : null}

        {!isLoading && isError ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-6 text-center text-rose-700">
            <AlertCircle className="h-6 w-6" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Unable to load details.</p>
              <p className="text-xs">{getApiErrorMessage(error, "Please try again.")}</p>
            </div>
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError ? children : null}
      </div>
    </SimpleModal>
  );
}
