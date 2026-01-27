"use client";
import React, { useState, useEffect, useRef } from "react";
import { Bell, Search, X, Building2, Car, Radio, User, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGetMeQuery } from "@/redux/api/usersApi";
import {
    useGetNotificationsQuery,
    useMarkAsReadMutation,
    useDeleteNotificationMutation,
    useClearAllNotificationsMutation
} from "@/redux/api/notificationsApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

export default function Header() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Array<{ type: string; id: string; name: string; details: string }>>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Redux Hooks
    const { data: userData } = useGetMeQuery(undefined);
    const { data: notifData } = useGetNotificationsQuery(undefined, { pollingInterval: 15000 });
    const { data: orgData } = useGetOrganizationsQuery(undefined);

    const [markAsRead] = useMarkAsReadMutation();
    const [deleteNotification] = useDeleteNotificationMutation();
    const [clearAllNotifications] = useClearAllNotificationsMutation();

    const notifications = notifData?.data || [];
    const adminUser = userData?.data || {};
    const organizations = orgData?.data || [];

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
        <header className="h-16 bg-[#111827] border-b border-[#1E293B] fixed top-0 right-0 left-64 z-40 px-6 flex items-center justify-between">
            <div className="w-[420px] relative" ref={searchRef}>
                {/* Search disabled temporarily as per refactor plan */}
                <div className="relative opacity-50 cursor-not-allowed">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search unavailable (Backend pending)..."
                        disabled
                        className="w-full pl-10 pr-4 py-2 border border-[#1E293B] rounded-xl text-sm font-semibold text-[#E5E7EB] bg-[#020617] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] placeholder-[#9CA3AF] transition cursor-not-allowed"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 text-[#9CA3AF] hover:bg-[#020617] rounded-full transition"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#EF4444] rounded-full border border-[#111827]"></span>
                        )}
                    </button>

                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-[#020617] border border-[#1E293B] rounded-xl shadow-lg max-h-96 overflow-y-auto z-50">
                            <div className="p-4 border-b border-[#1E293B] flex items-center justify-between sticky top-0 bg-[#020617]">
                                <h3 className="text-sm font-black text-[#E5E7EB] uppercase tracking-widest">Notifications</h3>
                                <div className="flex items-center gap-2">
                                    {unreadCount > 0 && (
                                        <span className="text-xs font-semibold text-[#EF4444]">{unreadCount} unread</span>
                                    )}
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={handleClearAllNotifications}
                                            className="text-xs font-semibold text-[#9CA3AF] hover:text-[#E5E7EB] underline"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-4 text-sm text-[#9CA3AF] text-center">No notifications</div>
                                ) : (
                                    notifications.map((notif: any) => (
                                        <div
                                            key={notif._id}
                                            className={`relative group px-4 py-3 border-b border-[#1E293B] last:border-b-0 transition-colors ${!notif.read ? "bg-[#111827]" : ""
                                                }`}
                                        >
                                            <button
                                                onClick={() => handleNotificationClick(notif)}
                                                className="w-full text-left"
                                            >
                                                <div className="text-sm font-semibold text-[#E5E7EB] pr-8">{notif.title}</div>
                                                <div className="text-xs text-[#9CA3AF] mt-1">{notif.message}</div>
                                                <div className="text-[10px] text-[#6B7280] mt-1">
                                                    {new Date(notif.createdAt || notif.timestamp).toLocaleString()}
                                                </div>
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteNotification(e, notif._id)}
                                                className="absolute top-3 right-3 p-1 text-[#9CA3AF] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity"
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

                <div className="h-8 w-px bg-[#1E293B]"></div>

                <button
                    onClick={() => router.push("/admin/profile")}
                    className="flex items-center gap-3 hover:bg-[#020617] rounded-lg px-2 py-1 transition-colors cursor-pointer"
                >
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-[#E5E7EB]">{adminUser.name || "Admin User"}</p>
                        <p className="text-xs text-[#9CA3AF]">{adminUser.email || "admin@example.com"}</p>
                    </div>
                    {adminUser.avatar ? (
                        <div className="w-10 h-10 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-bold border-2 border-[#2563EB]">
                            {/* If avatar is URL, use img, else initials */}
                            {adminUser.avatar.startsWith("http") ? <img src={adminUser.avatar} className="w-full h-full rounded-full object-cover" /> : adminUser.avatar}
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-bold border-2 border-[#2563EB]">
                            {userInitials}
                        </div>
                    )}
                </button>
            </div>
        </header>
    );
}
