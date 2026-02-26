"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
    Bell,
    Globe,
    Shield,
    ArrowLeft,
    Save,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import { Header } from "@/components/dashboard/header"
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"
import { useGetMeQuery } from "@/redux/api/usersApi"

// ─── Toggle component ─────────────────────────────────────────────────────────
function Toggle({
    label,
    description,
    checked,
    onChange,
}: {
    label: string
    description: string
    checked: boolean
    onChange: (v: boolean) => void
}) {
    return (
        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/40 px-5 py-4 hover:border-white/20 transition-colors">
            <div className="space-y-0.5">
                <p className="text-sm font-semibold text-slate-100">{label}</p>
                <p className="text-xs text-slate-400">{description}</p>
            </div>
            <button
                type="button"
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none ${checked ? "bg-emerald-500" : "bg-slate-600"}`}
                role="switch"
                aria-checked={checked}
            >
                <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
                />
            </button>
        </div>
    )
}

// ─── Section card ─────────────────────────────────────────────────────────────
function SectionCard({
    icon: Icon,
    iconColor,
    title,
    children,
}: {
    icon: React.ElementType
    iconColor: string
    title: string
    children: React.ReactNode
}) {
    return (
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-white/10 px-6 py-4 bg-slate-800/40">
                <div className={`rounded-lg p-2 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">{title}</h2>
            </div>
            <div className="p-6 space-y-3">{children}</div>
        </div>
    )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardSettingsPage() {
    const router = useRouter()
    const [isAuthed, setIsAuthed] = useState(false)

    // Notification preferences (client-side for now — extend with backend as needed)
    const [pushNotifications, setPushNotifications] = useState(true)
    const [emailAlerts, setEmailAlerts] = useState(true)
    const [smsGateway, setSmsGateway] = useState(false)
    const [soundAlerts, setSoundAlerts] = useState(true)

    // App preferences
    const [darkMode, setDarkMode] = useState(true)
    const [autoRefresh, setAutoRefresh] = useState(true)
    const [compactView, setCompactView] = useState(false)

    const [isSaving, setIsSaving] = useState(false)

    const { data: meData } = useGetMeQuery(undefined)
    const user = (meData as { data?: Record<string, unknown> } | null)?.data

    // Auth guard
    useEffect(() => {
        const token = getSecureItem("token")
        const role = getSecureItem("userRole")
        if (!token) { router.replace("/"); return }
        if (role && ["admin", "manager", "driver"].includes(role)) {
            setIsAuthed(true)
        } else {
            router.replace("/")
        }
    }, [router])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            // Persist to localStorage as user preferences
            const prefs = {
                pushNotifications,
                emailAlerts,
                smsGateway,
                soundAlerts,
                darkMode,
                autoRefresh,
                compactView,
            }
            if (typeof window !== "undefined") {
                localStorage.setItem("dashboardPrefs", JSON.stringify(prefs))
            }
            await new Promise((resolve) => setTimeout(resolve, 400)) // simulate async
            toast.success("Settings saved successfully")
        } catch {
            toast.error("Failed to save settings")
        } finally {
            setIsSaving(false)
        }
    }

    const handleDiscard = () => {
        try {
            if (typeof window !== "undefined") {
                const saved = localStorage.getItem("dashboardPrefs")
                if (saved) {
                    const prefs = JSON.parse(saved)
                    setPushNotifications(prefs.pushNotifications ?? true)
                    setEmailAlerts(prefs.emailAlerts ?? true)
                    setSmsGateway(prefs.smsGateway ?? false)
                    setSoundAlerts(prefs.soundAlerts ?? true)
                    setDarkMode(prefs.darkMode ?? true)
                    setAutoRefresh(prefs.autoRefresh ?? true)
                    setCompactView(prefs.compactView ?? false)
                }
            }
        } catch {
            // ignore
        }
        toast.message("Changes discarded")
    }

    if (!isAuthed) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
                Checking session…
            </div>
        )
    }

    return (
        <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
            <Header vehicleSummary={{ label: "Settings", speed: 0 }} />

            <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
                <div className="mx-auto max-w-4xl">
                    {/* Breadcrumb */}
                    <div className="mb-6 flex items-center gap-2">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-emerald-400 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Dashboard
                        </button>
                        <span className="text-slate-600">/</span>
                        <span className="text-sm font-semibold text-slate-200">Settings</span>
                    </div>

                    {/* Title */}
                    <div className="mb-8">
                        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
                        <p className="mt-1 text-sm text-slate-400">Configure your dashboard preferences and notifications</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* ── Main settings (2/3 width) ── */}
                        <div className="space-y-6 lg:col-span-2">
                            {/* Notification Channels */}
                            <SectionCard icon={Bell} iconColor="bg-amber-500/20 text-amber-400" title="Notification Channels">
                                <Toggle
                                    label="Push Notifications"
                                    description="Real-time alerts pushed to your browser"
                                    checked={pushNotifications}
                                    onChange={setPushNotifications}
                                />
                                <Toggle
                                    label="Email Alerts"
                                    description="Receive alerts and reports via email"
                                    checked={emailAlerts}
                                    onChange={setEmailAlerts}
                                />
                                <Toggle
                                    label="SMS Gateway"
                                    description="Receive critical alerts via SMS"
                                    checked={smsGateway}
                                    onChange={setSmsGateway}
                                />
                                <Toggle
                                    label="Sound Alerts"
                                    description="Audio notification for new alerts"
                                    checked={soundAlerts}
                                    onChange={setSoundAlerts}
                                />
                            </SectionCard>

                            {/* App Preferences */}
                            <SectionCard icon={Globe} iconColor="bg-blue-500/20 text-blue-400" title="App Preferences">
                                <Toggle
                                    label="Dark Mode"
                                    description="Use dark theme across the dashboard"
                                    checked={darkMode}
                                    onChange={setDarkMode}
                                />
                                <Toggle
                                    label="Auto Refresh"
                                    description="Automatically refresh live vehicle data every 10 seconds"
                                    checked={autoRefresh}
                                    onChange={setAutoRefresh}
                                />
                                <Toggle
                                    label="Compact View"
                                    description="Reduce spacing in vehicle table for more rows"
                                    checked={compactView}
                                    onChange={setCompactView}
                                />
                            </SectionCard>
                        </div>

                        {/* ── Sidebar: Account + Quick Links ── */}
                        <div className="space-y-6">
                            {/* Account summary */}
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                    <Shield className="h-3.5 w-3.5" />
                                    Account
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400 text-sm font-black text-slate-900 shrink-0">
                                        {((user?.firstName as string) || "U").charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-100">
                                            {`${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "User"}
                                        </p>
                                        <p className="text-xs text-slate-400">{(user?.email as string) || ""}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => router.push("/dashboard/profile")}
                                    className="flex w-full items-center justify-between rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                                >
                                    Edit Profile
                                    <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                                </button>
                            </div>

                            {/* System Info */}
                            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                    System Status
                                </div>
                                <div className="space-y-2 text-xs">
                                    {[
                                        { label: "Version", value: "v2.5.0" },
                                        { label: "Environment", value: "Production" },
                                        { label: "Backend", value: "localhost:5000" },
                                    ].map((item) => (
                                        <div key={item.label} className="flex justify-between border-b border-white/5 pb-2">
                                            <span className="text-slate-500">{item.label}</span>
                                            <span className="font-semibold text-slate-300">{item.value}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-1">
                                        <span className="text-slate-500">Status</span>
                                        <span className="flex items-center gap-1 font-bold text-emerald-400">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                            Online
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Danger zone */}
                            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-400 mb-3">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Danger Zone
                                </div>
                                <p className="text-xs text-slate-400 mb-4">
                                    Maintenance mode disables all active tracking sessions immediately.
                                </p>
                                <button
                                    onClick={() => {
                                        if (window.confirm("Enable maintenance mode? This will disconnect all active sessions.")) {
                                            toast.warning("Maintenance mode enabled")
                                        }
                                    }}
                                    className="w-full rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs font-bold uppercase tracking-wider text-red-300 hover:bg-red-500/20 transition-colors"
                                >
                                    Maintenance Mode
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Save/Discard bar */}
                    <div className="mt-8 flex items-center justify-end gap-4 border-t border-white/10 pt-6">
                        <button
                            type="button"
                            onClick={handleDiscard}
                            className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-2.5 text-sm font-bold text-slate-900 hover:bg-emerald-400 transition-colors disabled:opacity-60"
                        >
                            {isSaving ? (
                                <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                            ) : (
                                <><Save className="h-4 w-4" />Save All Settings</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
