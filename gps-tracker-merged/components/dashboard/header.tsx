"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Settings,
    Bell,
    Calendar,
    Clock,
    Car,
    LogOut,
    Plus,
    User,
    ChevronDown,
    Check,
    AlertCircle,
    LayoutDashboard,
} from "lucide-react"
import type { Vehicle } from "@/types"
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"
import { useGetMeQuery } from "@/redux/api/usersApi"
import { useGetNotificationsQuery } from "@/redux/api/notificationsApi"
import { useMarkAsReadMutation } from "@/redux/api/notificationsApi"
import { baseApi } from "@/redux/api/baseApi"
import { useDispatch } from "react-redux"

// ── Helpers ───────────────────────────────────────────────────────────────────

function toRelativeTime(value?: string): string {
    if (!value) return "just now"
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return "just now"
    const diff = Math.floor((Date.now() - ts) / 60000)
    if (diff < 1) return "just now"
    if (diff < 60) return `${diff}m ago`
    const h = Math.floor(diff / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
}

function severityColor(sev?: string): string {
    switch ((sev || "").toLowerCase()) {
        case "critical":
        case "high":
            return "text-red-400"
        case "medium":
            return "text-amber-400"
        default:
            return "text-blue-400"
    }
}

// ── Notification Dropdown ─────────────────────────────────────────────────────

interface NotifItem {
    _id: string
    alertName?: string
    message?: string
    severity?: string
    acknowledged?: boolean
    createdAt?: string
    gpsTimestamp?: string
    receivedAt?: string
}

function NotificationDropdown({
    isOpen,
    onClose,
    notifications,
    unreadCount,
    onMarkRead,
}: {
    isOpen: boolean
    onClose: () => void
    notifications: NotifItem[]
    unreadCount: number
    onMarkRead: (id: string) => void
}) {
    if (!isOpen) return null

    return (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-slate-800 border border-white/10 shadow-2xl ring-1 ring-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-slate-800/80">
                <span className="text-sm font-bold text-slate-100">Notifications</span>
                {unreadCount > 0 && (
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                        {unreadCount} new
                    </span>
                )}
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                        <Bell className="h-7 w-7 opacity-40" />
                        <p className="text-xs font-semibold">No notifications</p>
                    </div>
                ) : (
                    notifications.slice(0, 10).map((n) => (
                        <div
                            key={n._id}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition-colors ${!n.acknowledged ? "bg-white/[0.03]" : ""
                                }`}
                        >
                            <AlertCircle className={`h-4 w-4 mt-0.5 shrink-0 ${severityColor(n.severity)}`} />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-100 truncate">
                                    {n.alertName || n.message || "Alert"}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                    {toRelativeTime(n.gpsTimestamp || n.receivedAt || n.createdAt)}
                                </p>
                            </div>
                            {!n.acknowledged && (
                                <button
                                    onClick={() => onMarkRead(n._id)}
                                    className="shrink-0 rounded p-1 hover:bg-emerald-500/20 text-slate-500 hover:text-emerald-400 transition-colors"
                                    title="Mark as read"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {notifications.length > 0 && (
                <div className="border-t border-white/10 px-4 py-2">
                    <button
                        onClick={onClose}
                        className="w-full text-center text-[10px] font-semibold text-slate-400 hover:text-emerald-300 transition-colors py-1"
                    >
                        View all notifications
                    </button>
                </div>
            )}
        </div>
    )
}

// ── Profile Dropdown ──────────────────────────────────────────────────────────

function ProfileDropdown({
    isOpen,
    displayName,
    email,
    role,
    user,
    onProfile,
    onSettings,
    onLogout,
}: {
    isOpen: boolean
    displayName: string
    email: string
    role: string
    user: any
    onProfile: () => void
    onSettings: () => void
    onLogout: () => void
}) {
    if (!isOpen) return null

    return (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-slate-800 border border-white/10 shadow-2xl ring-1 ring-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Avatar header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-900/30 to-slate-800">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-400 bg-white overflow-hidden shrink-0">
                    {user?.organizationId?.logo ? (
                        <img
                            src={`http://localhost:5000${user.organizationId.logo}`}
                            alt="Org Logo"
                            className="h-full w-full object-contain p-1"
                        />
                    ) : (
                        <span className="text-lg font-bold text-slate-900">
                            {displayName.charAt(0).toUpperCase()}
                        </span>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-100 truncate">{displayName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{email}</p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                        {role}
                    </span>
                </div>
            </div>

            {/* Links */}
            <div className="divide-y divide-white/5 py-1">
                <button
                    onClick={onProfile}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <User className="h-4 w-4 text-slate-400" />
                    My Profile
                </button>
                <button
                    onClick={onSettings}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <Settings className="h-4 w-4 text-slate-400" />
                    Settings
                </button>
                <button
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </button>
            </div>
        </div>
    )
}

// ── Header (Main Export) ──────────────────────────────────────────────────────

export function Header({
    vehicleSummary,
}: {
    vehicleSummary?: { label: string; speed: number }
}) {
    const [showNotifDropdown, setShowNotifDropdown] = useState(false)
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const [now, setNow] = useState(() => new Date())
    const router = useRouter()
    const dispatch = useDispatch()

    const notifRef = useRef<HTMLDivElement>(null)
    const profileRef = useRef<HTMLDivElement>(null)

    const userRole = getSecureItem("userRole")
    const canCreateVehicle = userRole === "admin"

    const { data: meData } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true })
    const { data: notifData, refetch: refetchNotifs } = useGetNotificationsQuery(undefined, {
        pollingInterval: 60000,
        refetchOnMountOrArgChange: true,
    })
    const [markAsRead] = useMarkAsReadMutation()

    const user = meData?.data
    const displayName = useMemo(() => {
        if (!user) return "User"
        return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "User"
    }, [user])
    const email = user?.email || ""
    const role = user?.role || userRole || "user"

    const notifications: NotifItem[] = useMemo(
        () => (notifData as { data?: NotifItem[] } | null)?.data || [],
        [notifData]
    )
    const unreadCount = useMemo(
        () => notifications.filter((n) => !n.acknowledged).length,
        [notifications]
    )

    // Clock
    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(interval)
    }, [])

    // Close dropdowns on outside click
    useEffect(() => {
        function handler(e: MouseEvent) {
            if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
                setShowNotifDropdown(false)
            }
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileDropdown(false)
            }
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const dateLabel = useMemo(
        () =>
            now.toLocaleDateString("en-GB", {
                weekday: "short",
                day: "2-digit",
                month: "long",
                year: "numeric",
            }),
        [now]
    )
    const timeLabel = useMemo(
        () =>
            now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
            }),
        [now]
    )

    const handleMarkRead = async (id: string) => {
        try {
            await markAsRead(id).unwrap()
            refetchNotifs()
        } catch {
            // silently fail
        }
    }

    const handleLogout = async () => {
        try {
            await fetch("http://localhost:5000/api/users/logout", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${getSecureItem("token")}`,
                },
            })
        } catch {
            // fail silently
        } finally {
            if (typeof window !== "undefined") {
                localStorage.clear()
                sessionStorage.clear()
                // Clear Redux cache
                dispatch(baseApi.util.resetApiState())
            }
            router.replace("/")
        }
    }

    return (
        <header className="relative flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/90 backdrop-blur-md px-4 text-white shadow-xl z-30 sticky top-0">
            {/* Background decorative elements - hidden on small mobile for cleaner look */}
            <div className="absolute inset-y-0 left-0 w-32 bg-emerald-500/5 hidden sm:block" />
            <div className="absolute inset-y-0 left-28 w-8 bg-emerald-500/5 -skew-x-12 hidden md:block" />

            {/* Left: Logo */}
            <div className="relative z-10 flex items-center gap-2 group cursor-pointer" onClick={() => router.push("/dashboard")}>
                <div className="relative h-9 w-9 shrink-0 flex items-center justify-center">
                    {user?.organizationId?.logo ? (
                        <div className="relative h-full w-full rounded-full border-2 border-emerald-400/40 group-hover:border-emerald-400/80 transition-all overflow-hidden bg-white/5 p-1">
                            <img
                                src={`http://localhost:5000${user.organizationId.logo}`}
                                alt="Logo"
                                className="h-full w-full object-contain"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="absolute inset-0 rounded-full border-2 border-emerald-400/40 group-hover:border-emerald-400/80 transition-colors" />
                            <div className="relative flex h-full w-full items-center justify-center rounded-full bg-emerald-400 text-xs font-black text-slate-900 shadow-lg shadow-emerald-400/20">
                                AT
                            </div>
                        </>
                    )}
                </div>
                <span className="hidden leading-tight font-black text-lg tracking-tighter sm:block">
                    Ajiva<span className="text-emerald-400">Tracker</span>
                </span>
            </div>

            {/* Center: Date/Time/Speed pill - Optimized for different screens */}
            <div className="relative z-10 hidden md:flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-[11px] font-bold shadow-inner backdrop-blur-sm lg:px-6 lg:text-xs">
                <div className="hidden lg:flex items-center gap-2 text-slate-300">
                    <Calendar className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[120px]">{dateLabel}</span>
                </div>
                <span className="hidden lg:block h-3 w-px bg-white/20" />
                <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{timeLabel}</span>
                </div>
                <span className="h-3 w-px bg-white/20" />
                <div className="flex items-center gap-2">
                    <Car className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-50 text-xs shadow-emerald-400/10">
                        {vehicleSummary?.label
                            ? `${vehicleSummary.label} · ${vehicleSummary.speed} km/h`
                            : "Vehicle · 0 km/h"}
                    </span>
                </div>
            </div>

            {/* Right: Notifications + Settings + Profile */}
            <div className="relative z-10 flex items-center gap-0.5 sm:gap-1">
                {/* Admin Overview Button - Compact on mobile */}
                {userRole === "admin" && (
                    <button
                        onClick={() => router.push("/admin")}
                        className="flex h-9 w-9 sm:w-auto items-center justify-center sm:gap-2 rounded-lg sm:px-3 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-emerald-300 transition-all active:scale-95"
                        title="Admin Overview"
                    >
                        <LayoutDashboard className="h-5 w-5 sm:h-4 sm:w-4" />
                        <span className="hidden lg:inline">Overview</span>
                    </button>
                )}

                {/* ── Notification Bell ── */}
                <div ref={notifRef} className="relative">
                    <button
                        onClick={() => {
                            setShowNotifDropdown((prev) => !prev)
                            setShowProfileDropdown(false)
                        }}
                        className={`relative flex h-9 w-9 items-center justify-center rounded-full transition-all active:scale-90 ${showNotifDropdown ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                        title="Notifications"
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black border-2 border-slate-950">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </button>
                    <NotificationDropdown
                        isOpen={showNotifDropdown}
                        onClose={() => setShowNotifDropdown(false)}
                        notifications={notifications}
                        unreadCount={unreadCount}
                        onMarkRead={handleMarkRead}
                    />
                </div>

                {/* ── Profile Avatar + Dropdown ── */}
                <div ref={profileRef} className="relative ml-1 sm:ml-2 border-l border-white/10 pl-1 sm:pl-2">
                    <button
                        onClick={() => {
                            setShowProfileDropdown((prev) => !prev)
                            setShowNotifDropdown(false)
                        }}
                        className={`flex items-center gap-1.5 sm:gap-2 rounded-full p-0.5 sm:pr-3 transition-all active:scale-95 ${showProfileDropdown ? 'bg-emerald-500/20 shadow-lg shadow-emerald-500/10' : 'hover:bg-white/5'}`}
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/50 bg-white overflow-hidden shrink-0 shadow-md">
                            {user?.organizationId?.logo ? (
                                <img
                                    src={`http://localhost:5000${user.organizationId.logo}`}
                                    alt="Org Logo"
                                    className="h-full w-full object-contain p-0.5"
                                />
                            ) : (
                                <span className="text-sm font-black text-slate-900">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>
                        <span className="hidden text-sm font-black text-slate-100 sm:block max-w-[80px] lg:max-w-[120px] truncate leading-none">
                            {displayName.split(" ")[0]}
                        </span>
                        <ChevronDown
                            className={`hidden sm:block h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${showProfileDropdown ? "rotate-180 text-emerald-400" : ""}`}
                        />
                    </button>

                    <ProfileDropdown
                        isOpen={showProfileDropdown}
                        displayName={displayName}
                        email={email}
                        role={role}
                        user={user}
                        onProfile={() => {
                            router.push("/dashboard/profile")
                            setShowProfileDropdown(false)
                        }}
                        onSettings={() => {
                            router.push("/dashboard/settings")
                            setShowProfileDropdown(false)
                        }}
                        onLogout={handleLogout}
                    />
                </div>
            </div>
        </header>
    )
}
