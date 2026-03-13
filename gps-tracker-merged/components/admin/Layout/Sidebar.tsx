"use client";
import React from "react";
import { usePathname, useRouter } from "next/navigation";

// 🔐 ORG CONTEXT UPDATE
import { useOrgContext } from "@/hooks/useOrgContext";

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
    X,
    Clock3,
} from "lucide-react";

const menuGroups = [
    {
        title: "System",
        items: [
            { name: "Dashboard", icon: LayoutDashboard, href: "/admin", exact: true, roles: ["admin", "manager"] },
            { name: "Live Tracking", icon: Map, href: "/admin/live-tracking", roles: ["admin", "manager"] },
        ]
    },
    {
        title: "Management",
        items: [
            { name: "Organizations", icon: Building2, href: "/admin/organizations", roles: ["admin"], superOnly: true },
            { name: "Vehicles", icon: Car, href: "/admin/vehicles", roles: ["admin", "manager"] },
            { name: "GPS Devices", icon: Radio, href: "/admin/gps-devices", roles: ["admin", "manager"] },
            { name: "Users", icon: Users, href: "/admin/users", roles: ["admin", "manager"] },
            { name: "Drivers", icon: Users, href: "/admin/drivers", roles: ["admin", "manager"] },
        ]
    },
    {
        title: "Operations",
        items: [
            { name: "Device Mapping", icon: LinkIcon, href: "/admin/device-mapping", roles: ["admin", "manager"] },
            { name: "Driver Mapping", icon: LinkIcon, href: "/admin/driver-mapping", roles: ["admin", "manager"] },
        ]
    },
    {
        title: "Config",
        items: [
            { name: "Settings", icon: Settings, href: "/admin/settings", roles: ["admin"] },
            { name: "Permissions", icon: Settings, href: "/admin/permissions", roles: ["admin"] },
        ]
    }
];

type SidebarProps = {
    className?: string;
    showClose?: boolean;
    onClose?: () => void;
    onNavigate?: () => void;
    role?: string | null;
};

export default function Sidebar({ className, showClose, onClose, onNavigate, role }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();

    // 🔐 ORG CONTEXT UPDATE
    const { orgName, isSuperAdmin, isRootOrgAdmin } = useOrgContext();

    const visibleGroups = menuGroups
        .map((group) => ({
            ...group,
            items: group.items.filter((item: any) => {
                // 🔐 ORG CONTEXT UPDATE
                if (item.name === "Organizations" || item.name === "Settings" || item.name === "Permissions") {
                    if (!isSuperAdmin) {
                        // Special case: root org admin can see Organizations but only for sub-orgs
                        // But menu definition says "superOnly" usually.
                        // Let's stick to strict: only superadmin for Settings/Permissions.
                        // Root Org Admin can see Organizations (checked below).
                        if (item.name === "Settings" || item.name === "Permissions") return false;
                        if (item.name === "Organizations" && !isRootOrgAdmin) return false;
                    }
                }
                if (!item.roles) return true;
                return item.roles.includes(role || "admin");
            }),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <aside className={`w-64 bg-white border-r border-slate-200 h-screen fixed left-0 top-0 flex flex-col z-50 ${className || ""}`}>
            <div className="h-16 flex items-center px-6 border-b border-slate-200 justify-between">
                <span className="text-xl font-black text-slate-900 tracking-tight">
                    {orgName}
                    <span className="text-slate-400 text-xs font-semibold ml-2 uppercase tracking-[0.35em]">Admin</span>
                </span>
                {showClose && (
                    <button
                        type="button"
                        className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition"
                        onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-6">
                <div className="space-y-6 px-4">
                    {visibleGroups.map((group) => (
                        <div key={group.title}>
                            <h3 className="px-1 mb-2 text-[10px] font-black uppercase text-slate-400 tracking-[0.35em]">
                                {group.title}
                            </h3>
                            <ul className="space-y-1">
                                {group.items.map((item: any) => {
                                    // Fix active state: exact match for dashboard, prefix match for others
                                    const isActive = item.exact
                                        ? pathname === item.href
                                        : pathname === item.href || (pathname.startsWith(`${item.href}/`) && item.href !== "/admin");
                                    return (
                                        <li key={item.name}>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    router.push(item.href);
                                                    onNavigate?.();
                                                }}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all w-full relative ${isActive
                                                    ? "bg-blue-50 text-slate-900 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.75 before:bg-blue-500 before:rounded-r"
                                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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
            <div className="p-4 border-t border-slate-200">
                <button
                    onClick={() => {
                        if (typeof window !== "undefined") {
                            const confirmLogout = window.confirm("Are you sure you want to sign out?");
                            if (confirmLogout) {
                                localStorage.removeItem("token");
                                localStorage.removeItem("userRole");
                                localStorage.removeItem("user");
                                window.location.href = "/";
                            }
                        }
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <LogOut size={20} />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
