"use client";
import React from "react";
import { Play, Pause, Square, PowerOff, Database, List,Users2 } from "lucide-react";

interface StatusCardsProps {
    stats: {
        running: number;
        idle: number;
        stopped: number;
        inactive: number;
        noData: number;
        total: number;
        organizations: number;
    };
    onCardClick?: (label: string) => void;
}

export default function StatusCards({ stats, onCardClick }: StatusCardsProps) {
    const cards = [
        { label: "Organizations", count: stats.organizations, icon: Users2, color: "bg-purple-600", iconColor: "text-white", labelColor: "text-white", countColor: "text-gray-800" },
        { label: "Running", count: stats.running, icon: Play, color: "bg-[#2E7D32]", iconColor: "text-white" },
        { label: "Idle", count: stats.idle, icon: Pause, color: "bg-[#EF6C00]", iconColor: "text-white" },
        { label: "Stopped", count: stats.stopped, icon: Square, color: "bg-[#C62828]", iconColor: "text-white" },
        { label: "Inactive", count: stats.inactive, icon: PowerOff, color: "bg-[#1565C0]", iconColor: "text-white" },
        { label: "No Data", count: stats.noData, icon: Database, color: "bg-[#455A64]", iconColor: "text-white" },
        { label: "Total", count: stats.total, icon: List, color: "bg-[#EEEEEE]", iconColor: "text-gray-600", labelColor: "text-gray-600", countColor: "text-gray-800" },
    ];

    return (
        <div className="grid grid-cols-7 gap-0 overflow-hidden rounded-lg shadow-md border border-gray-200">
            {cards.map((card) => (
                <div 
                    key={card.label} 
                    onClick={() => onCardClick?.(card.label)}
                    className={`${card.color} p-4 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-105 cursor-pointer border-r border-white/10 last:border-r-0`}
                >
                    <div className="flex items-center gap-3">
                        <card.icon size={28} className={card.iconColor} />
                        <span className={`text-3xl font-black ${card.countColor || "text-white"}`}>{card.count}</span>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${card.labelColor || "text-white/80"}`}>{card.label}</span>
                </div>
            ))}
        </div>
    );
}
