"use client";
import React, { useState, useEffect, useRef } from "react";
import { Bell, Search, X, Building2, Car, Radio, User, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getNotifications, getAdminUser, getRootOrganization, searchAll, setNotifications } from "@/lib/admin-dummy-data";

export default function Header() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Array<{ type: string; id: string; name: string; details: string }>>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotificationsState] = useState(getNotifications());
    const [adminUser, setAdminUserState] = useState(getAdminUser());
    const [rootOrg, setRootOrgState] = useState(getRootOrganization());
    const searchRef = useRef<HTMLDivElement>(null);
    const notifRef = useRef<HTMLDivElement>(null);

    // Refresh admin user and org data on mount and periodically
    useEffect(() => {
        const refreshData = () => {
            setAdminUserState(getAdminUser());
            setRootOrgState(getRootOrganization());
        };

        // Refresh every 500ms to catch updates
        const interval = setInterval(refreshData, 500);
        return () => clearInterval(interval);
    }, []);

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
        if (searchQuery.trim()) {
            const results = searchAll(searchQuery);
            setSearchResults(results);
            setShowSearchResults(true);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    }, [searchQuery]);

    const handleSearchResultClick = (result: { type: string; id: string }) => {
        if (result.type === "Organization") {
            router.push("/admin/organizations");
        } else if (result.type === "Vehicle") {
            router.push("/admin/vehicles");
        } else if (result.type === "GPS Device") {
            router.push("/admin/gps-devices");
        } else if (result.type === "User") {
            router.push("/admin/users");
        }
        setSearchQuery("");
        setShowSearchResults(false);
    };

    const handleNotificationClick = (notif: any) => {
        const updated = notifications.map(n => n._id === notif._id ? { ...n, read: true } : n);
        setNotificationsState(updated);
        setNotifications(updated);
        setShowNotifications(false);
    };

    const handleDeleteNotification = (e: React.MouseEvent, notifId: string) => {
        e.stopPropagation();
        const updated = notifications.filter(n => n._id !== notifId);
        setNotificationsState(updated);
        setNotifications(updated);
        toast.success("Notification deleted");
    };

    const handleClearAllNotifications = () => {
        if (confirm("Are you sure you want to clear all notifications?")) {
            setNotificationsState([]);
            setNotifications([]);
            toast.success("All notifications cleared");
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const orgName = rootOrg?.name || "GPS Admin";

    const getIcon = (type: string) => {
        switch (type) {
            case "Organization": return <Building2 size={16} />;
            case "Vehicle": return <Car size={16} />;
            case "GPS Device": return <Radio size={16} />;
            case "User": return <User size={16} />;
            default: return null;
        }
    };

    return (
        <header className="h-16 bg-[#111827] border-b border-[#1E293B] fixed top-0 right-0 left-64 z-40 px-6 flex items-center justify-between">
            <div className="w-[420px] relative" ref={searchRef}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search everywhere..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => searchQuery && setShowSearchResults(true)}
                    className="w-full pl-10 pr-4 py-2 border border-[#1E293B] rounded-xl text-sm font-semibold text-[#E5E7EB] bg-[#020617] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] placeholder-[#9CA3AF] transition"
                />
                {searchQuery && (
                    <button
                        onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#E5E7EB]"
                    >
                        <X size={16} />
                    </button>
                )}

                {showSearchResults && searchResults.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-[#020617] border border-[#1E293B] rounded-xl shadow-lg max-h-96 overflow-y-auto z-50">
                        {searchResults.map((result) => (
                            <button
                                key={`${result.type}-${result.id}`}
                                onClick={() => handleSearchResultClick(result)}
                                className="w-full px-4 py-3 text-left hover:bg-[#111827] border-b border-[#1E293B] last:border-b-0 flex items-center gap-3 transition-colors"
                            >
                                <div className="text-[#9CA3AF]">{getIcon(result.type)}</div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-[#E5E7EB]">{result.name}</div>
                                    <div className="text-xs text-[#9CA3AF]">{result.type} • {result.details}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
                {showSearchResults && searchQuery && searchResults.length === 0 && (
                    <div className="absolute top-full mt-2 w-full bg-[#020617] border border-[#1E293B] rounded-xl shadow-lg p-4 text-sm text-[#9CA3AF] z-50">
                        No results found
                    </div>
                )}
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
                                    notifications.map((notif) => (
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
                                                    {new Date(notif.timestamp).toLocaleString()}
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
                        <p className="text-sm font-semibold text-[#E5E7EB]">{adminUser.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{adminUser.email}</p>
                    </div>
                    {adminUser.organizationLogo ? (
                        <img
                            src={adminUser.organizationLogo}
                            alt="Profile"
                            className="w-10 h-10 rounded-full object-cover border-2 border-[#2563EB]"
                        />
                    ) : (
                        <div className="w-10 h-10 bg-[#2563EB] rounded-full flex items-center justify-center text-white font-bold border-2 border-[#2563EB]">
                            {adminUser.avatar}
                        </div>
                    )}
                </button>
            </div>
        </header>
    );
}
