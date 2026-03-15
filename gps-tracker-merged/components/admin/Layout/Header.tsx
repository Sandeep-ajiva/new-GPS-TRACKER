"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Search, X, Building2, Car, Radio, User, Trash2, Menu, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";
import { useGetMeQuery } from "@/redux/api/usersApi";
import {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
    useDeleteNotificationMutation,
    useClearAllNotificationsMutation
} from "@/redux/api/notificationsApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetUsersQuery } from "@/redux/api/usersApi";
import { NotificationDropdown } from "./NotificationDropdown";
import { Badge } from "@/components/ui/badge";

type HeaderProps = {
    onOpenSidebar?: () => void;
};

const EMPTY_ARRAY: any[] = [];

export default function Header({ onOpenSidebar }: HeaderProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Array<{ type: string; id: string; name: string; details: string }>>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Redux Hooks
    const { data: userData } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: notifData } = useGetNotificationsQuery(undefined, {
        pollingInterval: 30000, // Poll every 30 seconds for real-time updates
        refetchOnMountOrArgChange: true,
    });

    // 🔐 ORG CONTEXT UPDATE
    const { orgName } = useOrgContext();
    const { data: vehData } = useGetVehiclesQuery(undefined);
    const { data: devicesData } = useGetGpsDevicesQuery(undefined);
    const { data: usersData } = useGetUsersQuery(undefined);
    const { data: orgData } = useGetOrganizationsQuery(undefined);

    const [markAsRead] = useMarkAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();
    const [clearAllNotifications] = useClearAllNotificationsMutation();

    const notifications = notifData?.data || EMPTY_ARRAY;
    const adminUser = userData?.data || {};
    const organizations = orgData?.data || EMPTY_ARRAY;
    const vehicles = vehData?.data || vehData?.vehicles || EMPTY_ARRAY;
    const devices = devicesData?.data || EMPTY_ARRAY;
    const allUsers = usersData?.data || usersData?.users || EMPTY_ARRAY;

    // Derived state
    const rootOrg = organizations.find((o: any) => !o.parentOrganizationId) || {};

    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const query = searchQuery.trim().toLowerCase();
        if (query.length > 1) {
            const results: any[] = [];

            // 1. Search Organizations
            (organizations || []).forEach((org: any) => {
                if (org.name?.toLowerCase().includes(query)) {
                    results.push({ type: "Organization", id: org._id, name: org.name, details: org.email || "Org", path: `/dashboard?organizationId=${org._id}` });
                }
            });

            // 2. Search Vehicles
            (vehicles || []).forEach((v: any) => {
                if (v.vehicleNumber?.toLowerCase().includes(query) || v.registrationNumber?.toLowerCase().includes(query)) {
                    results.push({ type: "Vehicle", id: v._id, name: v.vehicleNumber, details: v.vehicleType || "Vehicle", path: `/admin/vehicles?search=${encodeURIComponent(v.vehicleNumber)}` });
                }
            });

            // 3. Search Devices
            (devices || []).forEach((d: any) => {
                if (d.imei?.toLowerCase().includes(query) || d.model?.toLowerCase().includes(query)) {
                    results.push({ type: "GPS Device", id: d._id, name: d.imei, details: d.model || "Device", path: `/admin/gps-devices?search=${encodeURIComponent(d.imei)}` });
                }
            });

            // 4. Search Users
            (allUsers || []).forEach((u: any) => {
                const fullName = `${u.firstName} ${u.lastName}`;
                if (u.firstName?.toLowerCase().includes(query) || u.lastName?.toLowerCase().includes(query) || u.email?.toLowerCase().includes(query)) {
                    results.push({ type: "User", id: u._id, name: fullName, details: u.role || "User", path: `/admin/users?search=${encodeURIComponent(u.firstName)}` });
                }
            });

            setSearchResults(results.slice(0, 10)); // Top 10 results
            if (!showSearchResults) setShowSearchResults(true);
        } else {
            if (searchResults.length > 0) setSearchResults([]);
            if (showSearchResults) setShowSearchResults(false);
        }
    }, [searchQuery, organizations, vehicles, devices, allUsers, searchResults.length, showSearchResults]);


    const handleSearchResultClick = (result: { type: string; id: string }) => {
        // Search disabled for now
        setShowSearchResults(false);
    };

    const handleNotificationClick = async (notif: any) => {
        if (!notif.read) {
            try {
                await markAsRead(notif._id).unwrap();
            } catch (error) {
                console.error("Failed to mark read", error);
            }
        }
        setShowNotifications(false);
        // Navigate if notification has link (logic not yet in backend data, assuming plain notification for now)
    };

    const handleDeleteNotification = async (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        try {
            await deleteNotification(notifId).unwrap();
            toast.success("Notification deleted");
        } catch (error) {
            toast.error("Failed to delete notification");
        }
    };

    const handleClearAllNotifications = async () => {
        if (confirm("Are you sure you want to clear all notifications?")) {
            try {
                await clearAllNotifications(undefined).unwrap();
                toast.success("All notifications cleared");
            } catch (error) {
                toast.error("Failed to clear notifications");
            }
        }
    };

    const unreadCount = notifications.filter((n: any) => !n.acknowledged).length;

    const getIcon = (type: string) => {
        switch (type) {
            case "Organization": return <Building2 size={16} />;
            case "Vehicle": return <Car size={16} />;
            case "GPS Device": return <Radio size={16} />;
            case "User": return <User size={16} />;
            default: return null;
        }
    };

    const displayName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(" ") || adminUser.name || "Admin User";
    const userInitials = displayName
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "AD";

    return (
        <header className="fixed left-0 right-0 top-0 z-40 flex h-20 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/75 px-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl sm:px-6 md:left-72">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 md:hidden"
                    aria-label="Open sidebar"
                >
                    <Menu size={18} />
                </button>
                <div className="relative w-full max-w-55 sm:max-w-90 md:max-w-105" ref={searchRef}>
                    {/* Search disabled temporarily as per refactor plan */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        {showSearchResults && searchResults.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.16)]">
                                <div className="border-b border-slate-100 bg-slate-50 p-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">
                                    Search Results ({searchResults.length})
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {searchResults.map((result: any) => (
                                        <button
                                            key={`${result.type}-${result.id}`}
                                            onClick={() => {
                                                router.push(result.path);
                                                setShowSearchResults(false);
                                                setSearchQuery("");
                                            }}
                                            className="flex w-full items-center gap-3 border-b border-slate-100 p-3 transition-colors hover:bg-slate-50 last:border-0"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${result.type === 'Organization' ? 'bg-blue-50 text-blue-600' :
                                                result.type === 'Vehicle' ? 'bg-emerald-50 text-emerald-600' :
                                                    result.type === 'GPS Device' ? 'bg-amber-50 text-amber-600' :
                                                        'bg-purple-50 text-purple-600'
                                                }`}>
                                                {getIcon(result.type)}
                                            </div>
                                            <div className="text-left flex-1">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm font-bold text-slate-900">{result.name}</div>
                                                    <span className="text-[9px] font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{result.type}</span>
                                                </div>
                                                <div className="text-[10px] text-slate-500">{result.details}</div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchQuery && setShowSearchResults(true)}
                            placeholder="Search organizations..."
                            className="w-full rounded-2xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                        />
                    </div>

                </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">

                <button
                    onClick={() => router.push("/dashboard")}
                    className="group hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-600 shadow-sm transition-all hover:bg-slate-50 lg:flex"
                    title="Main Dashboard"
                >
                    <LayoutDashboard size={18} className="group-hover:text-emerald-500 transition-colors" />
                    <span className="text-xs font-bold uppercase tracking-wider hidden sm:block">Dashboard</span>
                </button>


                {/* Enhanced Notification Bell */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-gray-500 shadow-sm transition-colors hover:bg-slate-50"
                        title="Notifications"
                    >
                        <Bell size={20} />
                        {/* Unread count badge */}
                        {unreadCount > 0 && (
                            <Badge 
                                variant="default" 
                                className="absolute -top-1 -right-1 min-w-[20px] h-5 text-xs font-bold bg-red-600 text-white flex items-center justify-center"
                            >
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Badge>
                        )}
                    </button>

                    {/* Enhanced Notification Dropdown */}
                    <NotificationDropdown 
                        isOpen={showNotifications} 
                        onClose={() => setShowNotifications(false)} 
                    />
                </div>

                <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>

                <button
                    onClick={() => router.push("/admin/profile")}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-2.5 py-2 shadow-sm transition-colors hover:bg-slate-50"
                >
                    <div className="text-right hidden sm:block">
                        <div className="flex items-center justify-end gap-1.5 mb-0.5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {orgName}
                            </span>
                            <p className="text-sm font-semibold text-slate-900">{adminUser.name || "Admin User"}</p>
                        </div>
                        <p className="text-xs text-slate-500">{adminUser.email || "admin@example.com"}</p>
                    </div>
                    {adminUser?.organizationId?.logo ? (
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border-2 border-blue-200 overflow-hidden shadow-sm">
                            <img
                                src={`http://localhost:5000${adminUser.organizationId.logo}`}
                                alt="Org Logo"
                                className="w-full h-full object-contain p-1"
                            />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-blue-200">
                            {userInitials}
                        </div>
                    )}
                </button>
            </div>
        </header>
    );
}
