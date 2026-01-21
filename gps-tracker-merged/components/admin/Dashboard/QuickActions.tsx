"use client";
import React from "react";
import { 
    MapPin, 
    FileText, 
    Zap, 
    Thermometer, 
    Map as MapIcon, 
    ShieldCheck, 
    CircleDot, 
    Smartphone, 
    Settings, 
    Users, 
    AlertTriangle 
} from "lucide-react";

const actions = [
    { name: "Tracking", icon: MapPin },
    { name: "Reports", icon: FileText },
    { name: "Fuel", icon: Zap },
    { name: "Temperature", icon: Thermometer },
    { name: "Tour", icon: MapIcon },
    { name: "Licensing", icon: ShieldCheck },
    { name: "Geofences", icon: CircleDot },
    { name: "App Config", icon: Smartphone },
    { name: "Sys Config", icon: Settings },
    { name: "User Rights", icon: Users },
    { name: "Alerts", icon: AlertTriangle, badge: 312 },
];

export default function QuickActions() {
    return (
        <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200 shadow-sm overflow-x-auto no-scrollbar">
            {actions.map((action) => (
                <button 
                    key={action.name} 
                    className="flex flex-col items-center gap-1 px-4 py-2 hover:bg-gray-50 transition-colors rounded-lg group relative min-w-[80px]"
                >
                    <div className="w-10 h-10 flex items-center justify-center text-gray-500 group-hover:text-green-600 transition-colors">
                        <action.icon size={24} strokeWidth={1.5} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight group-hover:text-gray-900">{action.name}</span>
                    {action.badge && (
                        <span className="absolute top-1 right-2 bg-red-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                            {action.badge}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}
