"use client";

export type BasicRecord = Record<string, unknown>;

export const getCollection = <T>(payload: unknown, keys: string[]): T[] => {
  if (!payload || typeof payload !== "object") return [];

  for (const key of keys) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value as T[];
  }

  return [];
};

export const getDisplayName = (user?: {
  firstName?: string;
  lastName?: string;
  email?: string;
  name?: string;
} | null) => {
  if (!user) return "Super Admin";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.name || user.email || "Super Admin";
};

export const getInitials = (name?: string | null) => {
  if (!name) return "SA";
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "SA";
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
};

export const formatStatus = (value?: string | null) => {
  if (!value) return "Unknown";
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};
