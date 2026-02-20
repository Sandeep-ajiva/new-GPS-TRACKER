import Link from "next/link"
import { MapPin, FileText, Fuel, Thermometer, Share2, ClipboardList, Shield, Blocks, Settings, Users, Bell } from "lucide-react"

export function ActionToolbar({
    compact = false,
    className = "",
    alertCount = 0,
}: {
    compact?: boolean
    className?: string
    alertCount?: number
}) {
    const actions = [
        { label: "Tracking", icon: MapPin, href: "/dashboard" },
        { label: "Reports", icon: FileText, href: "/dashboard/reports" },
        { label: "Fuel", icon: Fuel, href: "/dashboard/fuel" },
        { label: "Temperature", icon: Thermometer, href: "/dashboard/temperature" },
        { label: "Tour", icon: Share2, href: "/dashboard/tour" },
        { label: "Licensing", icon: ClipboardList, href: "/dashboard/licensing" },
        { label: "Geofences", icon: Shield, href: "/dashboard/geofences" },
        { label: "App Config", icon: Blocks, href: "/dashboard/app-config" },
        { label: "Sys Config", icon: Settings, href: "/dashboard/sys-config" },
        { label: "User Rights", icon: Users, href: "/dashboard/users" },
        { label: "Alerts", icon: Bell, badge: alertCount, href: "/dashboard/alerts" },
    ]

    return (
        <div className={`flex items-center justify-between bg-slate-950/80 shadow-sm border-b border-white/10 overflow-x-auto ${compact ? "px-3 py-1.5" : "px-4 py-2"} ${className}`}>
            {actions.map((action) => (
                <Link
                    key={action.label}
                    href={action.href}
                    className={`flex flex-col items-center gap-1 min-w-17.5 transition-colors hover:text-emerald-300 group ${compact ? "min-w-14" : ""}`}
                >
                    <div className={`relative rounded-lg group-hover:bg-white/10 transition-colors ${compact ? "p-1.5" : "p-2"}`}>
                        <action.icon className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-slate-300 group-hover:text-emerald-300`} />
                        {action.badge && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                                {action.badge}
                            </span>
                        )}
                    </div>
                    <span className={`font-medium text-slate-300 group-hover:text-emerald-300 truncate max-w-full ${compact ? "text-[9px]" : "text-[10px]"}`}>
                        {action.label}
                    </span>
                </Link>
            ))}
        </div>
    )
}
