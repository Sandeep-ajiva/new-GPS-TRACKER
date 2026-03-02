"use client";
import React, { useState, useEffect, useRef } from "react";
import { Bell, Search, X, Building2, Car, Radio, User, Trash2, Menu } from "lucide-react";
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

// 🔐 ORG CONTEXT UPDATE
import { useOrgContext } from "@/hooks/useOrgContext";

type HeaderProps = {
    onOpenSidebar?: () => void;
};

export default function Header({ onOpenSidebar }: HeaderProps) {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Array<{ type: string; id: string; name: string; details: string }>>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Redux Hooks
    const { data: userData } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: notifData } = useGetNotificationsQuery(undefined, {
        pollingInterval: 60000, // Changed from 15000ms to 60000ms (60 seconds) to reduce excessive API calls
        refetchOnMountOrArgChange: true,
    });

    // 🔐 ORG CONTEXT UPDATE
    const { orgName } = useOrgContext();

    const [markAsRead] = useMarkAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();
    const [clearAllNotifications] = useClearAllNotificationsMutation();

    const notifications = notifData?.data || [];
    const adminUser = userData?.data || {};

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

    // Placeholder Search Effect - requires a real search API
    useEffect(() => {
        if (searchQuery.trim()) {
            // TODO: Implement real global search API. 
            // Current approach: clear results to avoid dummy data.
            setSearchResults([]);
            // Optionally could prompt user to go to specific pages
            // or implement client-side search if data is available in cache, 
            // but that's complex to wire up here without direct access to all cached lists.
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    }, [searchQuery]);

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

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    const getIcon = (type: string) => {
        switch (type) {
            case "Organization": return <Building2 size={16} />;
            case "Vehicle": return <Car size={16} />;
            case "GPS Device": return <Radio size={16} />;
            case "User": return <User size={16} />;
            default: return null;
        }
    };

    // User Avatar Initials
    const userInitials = adminUser.name
        ? adminUser.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
        : "AD";

    return (
        <header className="h-16 bg-white/90 backdrop-blur border-b border-slate-200 fixed top-0 right-0 left-0 md:left-64 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    type="button"
                    onClick={onOpenSidebar}
                    className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition"
                    aria-label="Open sidebar"
                >
                    <Menu size={18} />
                </button>
                <div className="w-full max-w-55 sm:max-w-90 md:max-w-105 relative" ref={searchRef}>
                    {/* Search disabled temporarily as per refactor plan */}
                    <div className="relative opacity-50 cursor-not-allowed">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search unavailable (Backend pending)..."
                            disabled
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 placeholder-slate-400 transition cursor-not-allowed"
                        />
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-lg max-h-96 overflow-y-auto z-50">
                            <div className="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95">
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <span className="text-xs font-semibold text-red-500">{unreadCount} unread</span>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={handleClearAllNotifications}
                                            className="text-xs font-semibold text-slate-500 hover:text-slate-900 underline"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-sm text-slate-500 text-center">No notifications</div>
                                ) : (
                                    notifications.map((notif: any) => (
                                        <div
                                            key={notif._id}
                                            className={`relative group px-4 py-3 border-b border-slate-100 last:border-b-0 transition-colors ${!notif.read ? "bg-blue-50/60" : ""
                                                }`}
                                        >
                                            <button
                                                onClick={() => handleNotificationClick(notif)}
                                                className="w-full text-left"
                                            >
                                                <div className="text-sm font-semibold text-slate-900 pr-8">{notif.title}</div>
                                                <div className="text-xs text-slate-500 mt-1">{notif.message}</div>
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {new Date(notif.createdAt || notif.timestamp).toLocaleString()}
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteNotification(e, notif._id)}
                                                className="absolute top-3 right-3 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete notification"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-8 w-px bg-slate-200"></div>

                <button
                    onClick={() => router.push("/admin/profile")}
                    className="flex items-center gap-3 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors cursor-pointer"
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
                    {adminUser.avatar ? (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold border-2 border-blue-200">
                            {/* If avatar is URL, use img, else initials */}
                            {adminUser.avatar.startsWith("http") ? <img src={adminUser.avatar} className="w-full h-full rounded-full object-cover" /> : adminUser.avatar}
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
