import { MapPin, FileText, Fuel, Thermometer, Share2, ClipboardList, Shield, Blocks, Settings, Users, Bell } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import { setActiveTab } from "@/redux/features/vehicleSlice"

export function ActionToolbar({
    compact = false,
    className = "",
    alertCount = 0,
}: {
    compact?: boolean
    className?: string
    alertCount?: number
}) {
    const dispatch = useAppDispatch()
    const activeTab = useAppSelector((state) => state.vehicle.activeTab)

    const actions = [
        { label: "Tracking", icon: MapPin },
        { label: "Reports", icon: FileText },
        { label: "Fuel", icon: Fuel },
        { label: "Temperature", icon: Thermometer },
        { label: "Tour", icon: Share2 },
        { label: "Licensing", icon: ClipboardList },
        { label: "Geofences", icon: Shield },
        { label: "App Config", icon: Blocks },
        { label: "Sys Config", icon: Settings },
        { label: "User Rights", icon: Users },
        { label: "Alerts", icon: Bell, badge: alertCount },
    ]

    return (
        <div className={`flex items-center justify-between bg-slate-950/80 shadow-sm border-b border-white/10 overflow-x-auto ${compact ? "px-3 py-1.5" : "px-4 py-2"} ${className}`}>
            {actions.map((action) => (
                <button
                    key={action.label}
                    onClick={() => dispatch(setActiveTab(action.label))}
                    className={`flex flex-col items-center gap-1 min-w-17.5 transition-all group ${compact ? "min-w-14" : ""} ${activeTab === action.label ? "text-emerald-400" : "text-slate-400 hover:text-emerald-300"}`}
                >
                    <div className={`relative rounded-lg transition-colors ${compact ? "p-1.5" : "p-2"} ${activeTab === action.label ? "bg-emerald-500/10" : "group-hover:bg-white/10"}`}>
                        <action.icon className={`${compact ? "h-4 w-4" : "h-5 w-5"} ${activeTab === action.label ? "text-emerald-400" : "text-slate-400 group-hover:text-emerald-300"}`} />
                        {action.badge && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                                {action.badge}
                            </span>
                        )}
                    </div>
                    <span className={`font-black uppercase tracking-tighter truncate max-w-full ${compact ? "text-[8px]" : "text-[9px]"} ${activeTab === action.label ? "text-emerald-400" : "text-slate-500 group-hover:text-emerald-300"}`}>
                        {action.label}
                    </span>
                </button>
            ))}
        </div>
    )
}
