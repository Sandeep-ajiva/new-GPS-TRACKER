"use client";

import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Car,
  LayoutDashboard,
  Link2,
  Radio,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

export type SuperAdminNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export const superAdminNavItems: SuperAdminNavItem[] = [
  {
    label: "Dashboard",
    href: "/superadmin",
    icon: LayoutDashboard,
    description: "Global platform overview",
  },
  {
    label: "Organizations",
    href: "/superadmin/organizations",
    icon: Building2,
    description: "Manage all organizations",
  },
  {
    label: "Users",
    href: "/superadmin/users",
    icon: Users,
    description: "Manage global platform users",
  },
  {
    label: "Vehicles",
    href: "/superadmin/vehicles",
    icon: Car,
    description: "Global fleet visibility",
  },
  {
    label: "GPS Devices",
    href: "/superadmin/gps-devices",
    icon: Radio,
    description: "Hardware and inventory control",
  },
  {
    label: "Device Mapping",
    href: "/superadmin/device-mapping",
    icon: Link2,
    description: "Map hardware to fleet assets",
  },
  {
    label: "Settings",
    href: "/superadmin/settings",
    icon: Settings,
    description: "Platform control settings",
  },
  {
    label: "Permissions",
    href: "/superadmin/permissions",
    icon: ShieldCheck,
    description: "Authority and access matrix",
  },
];

