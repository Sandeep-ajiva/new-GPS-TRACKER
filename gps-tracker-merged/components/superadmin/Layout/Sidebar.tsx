"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  LayoutDashboard,
  Users,
  Map,
  History,
  Car,
  Radio,
  Link as LinkIcon,
  Building2,
  Settings,
  LogOut,
  Briefcase,
  CreditCard,
  Warehouse,
} from "lucide-react";

const menuGroups = [
  {
    title: "System",
    items: [
      { name: "Dashboard", icon: LayoutDashboard, href: "/superadmin" },
      { name: "Live Tracking", icon: Map, href: "/superadmin/live-tracking" },
    ],
  },
  {
    title: "Management",
    items: [
      { name: "Organizations", icon: Building2, href: "/superadmin/organizations" },
      { name: "Vehicles", icon: Car, href: "/superadmin/vehicles" },
      { name: "GPS Devices", icon: Radio, href: "/superadmin/gps-devices" },
      { name: "Users", icon: Users, href: "/superadmin/users" },
    ],
  },
  {
    title: "Operations",
    items: [
      { name: "Device Mapping", icon: LinkIcon, href: "/superadmin/device-mapping" },
      { name: "History Playback", icon: History, href: "/superadmin/history" },
      { name: "Depots", icon: Warehouse, href: "/superadmin/depots" },
    ],
  },
  {
    title: "Business",
    items: [
      { name: "Services", icon: Briefcase, href: "/superadmin/services" },
      { name: "Billing", icon: CreditCard, href: "/superadmin/billing" },
    ],
  },
  {
    title: "Config",
    items: [
      { name: "Settings", icon: Settings, href: "/superadmin/settings" },
      { name: "Permissions", icon: Settings, href: "/superadmin/permissions" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const normalizedPath = pathname?.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-900 h-screen fixed left-0 top-0 flex flex-col z-50 text-slate-200">
      <div className="h-16 flex items-center px-6 border-b border-slate-900">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-200 font-black">
            GT
          </div>
          <div className="leading-tight">
            <img src="/ajiva-logo.svg" alt="Ajiva logo" className="h-5 w-auto" />
            <p className="text-[10px] uppercase tracking-[0.35em] text-emerald-400">Core</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-6">
        <div className="space-y-6 px-4">
          {menuGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-1 mb-2 text-[10px] font-black uppercase text-slate-500 tracking-[0.35em]">
                {group.title}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isDashboard = item.href === "/superadmin";
                  const isActive = isDashboard
                    ? normalizedPath === item.href
                    : normalizedPath === item.href || normalizedPath?.startsWith(`${item.href}/`);
                  return (
                    <li key={item.name}>
                      <button
                        type="button"
                        onClick={() => router.push(item.href)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30"
                            : "text-slate-300 hover:bg-slate-900 hover:text-white"
                        }`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <item.icon size={18} />
                        {item.name}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </nav>

      <div className="p-4 border-t border-slate-900">
        <button
          onClick={() => {
            if (typeof window !== "undefined") {
              const confirmLogout = window.confirm(
                "Are you sure you want to sign out?"
              );
              if (confirmLogout) {
                localStorage.removeItem("token");
                localStorage.removeItem("userRole");
                window.location.href = "/";
              }
            }
          }}
          className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
