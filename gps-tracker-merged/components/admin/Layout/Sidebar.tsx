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
    LogOut
} from "lucide-react";

const menuGroups = [
    {
        title: "System",
        items: [
            { name: "Dashboard", icon: LayoutDashboard, href: "/admin" },
            { name: "Live Tracking", icon: Map, href: "/admin/live-tracking" },
        ]
    },
    {
        title: "Management",
        items: [
            { name: "Organizations", icon: Building2, href: "/admin/organizations" },
            { name: "Vehicles", icon: Car, href: "/admin/vehicles" },
            { name: "GPS Devices", icon: Radio, href: "/admin/gps-devices" },
            { name: "Users", icon: Users, href: "/admin/users" },
        ]
    },
    {
        title: "Operations",
        items: [
            { name: "Device Mapping", icon: LinkIcon, href: "/admin/device-mapping" },
            { name: "History Playback", icon: History, href: "/admin/history" },
        ]
    },
    {
        title: "Config",
        items: [
            { name: "Settings", icon: Settings, href: "/admin/settings" },
            { name: "Permissions", icon: Settings, href: "/admin/permissions" },
        ]
    }
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    return (
        <aside className="w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-50">
            <div className="h-16 flex items-center px-6 border-b border-slate-100">
                <span className="text-xl font-black text-slate-900 tracking-tight">GPS
                    <span className="text-slate-400 text-xs font-semibold ml-2 uppercase tracking-[0.35em]">Admin</span>
                </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6">
                <div className="space-y-6 px-4">
                    {menuGroups.map((group) => (
                        <div key={group.title}>
                            <h3 className="px-1 mb-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.35em]">
                                {group.title}
                            </h3>
                            <ul className="space-y-1">
                                {group.items.map((item) => {
                                    const isActive =
                                        pathname === item.href ||
                                        pathname.startsWith(`${item.href}/`);
                                    return (
                                        <li key={item.name}>
                                            <button
                                                type="button"
                                                onClick={() => router.push(item.href)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                                                    isActive
                                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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

            {/* Footer / Logout */}
            <div className="p-4 border-t border-slate-100">
                <button
                    onClick={() => {
                        if (typeof window !== "undefined") {
                            const confirmLogout = window.confirm("Are you sure you want to sign out?");
                            if (confirmLogout) {
                                localStorage.removeItem("token");
                                localStorage.removeItem("userRole");
                                window.location.href = "/";
                            }
                        }
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
