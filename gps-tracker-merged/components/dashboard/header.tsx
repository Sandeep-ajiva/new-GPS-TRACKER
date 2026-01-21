"use client"

import { useState } from "react"
import { Menu, Settings, MessageSquare, Bell, Calendar, Clock, Car, LogOut, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import VehicleModal from "@/components/admin/Modals/VehicleModal"
import type { Vehicle } from "@/types"

export function Header({ onVehicleCreated }: { onVehicleCreated?: (vehicle: Vehicle) => void }) {
    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)

    return (
        <header className="relative flex h-16 items-center justify-between border-b border-white/10 bg-linear-to-r from-slate-950 via-slate-900 to-emerald-900/40 px-4 text-white shadow-[0_10px_30px_rgba(15,23,42,0.35)]">
            <div className="absolute inset-y-0 left-0 w-65 bg-emerald-500/10" />
            <div className="absolute inset-y-0 left-57.5 w-12 bg-emerald-500/10 -skew-x-12" />

            <div className="relative z-10 flex items-center gap-3">
                <div className="flex items-center gap-2 font-semibold text-lg">
                    <div className="relative h-9 w-9">
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-300/60" />
                        <div className="relative flex h-full w-full items-center justify-center rounded-full bg-emerald-400 text-xs font-bold text-slate-900">
                            AT
                        </div>
                    </div>
                    <span>Ajiva Tracker</span>
                </div>

                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Menu className="h-5 w-5" />
                </Button>
            </div>

            <div className="relative z-10 hidden items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold shadow-sm lg:flex text-slate-100">
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Fri, 22 December 2023</span>
                </div>
                <span className="h-4 w-px bg-white/30" />
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>11 : 58 : 17 AM</span>
                </div>
                <span className="h-4 w-px bg-white/30" />
                <div className="flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    <span>Car 85 ; 15km/h</span>
                </div>
            </div>

            <div className="relative z-10 flex items-center gap-1">
                <div className="hidden items-center gap-2 md:flex">
                    <Button
                        className="h-9 rounded-full bg-emerald-400 px-4 text-xs font-semibold uppercase tracking-wide text-slate-950 hover:bg-emerald-300"
                        onClick={() => setIsVehicleModalOpen(true)}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Vehicle
                    </Button>
                </div>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
                    <MessageSquare className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px]">15</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 text-[10px]">3</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                    <Settings className="h-5 w-5" />
                </Button>

                <div className="ml-3 flex items-center gap-2 border-l border-white/10 pl-3">
                    <div className="h-9 w-9 rounded-full bg-cyan-500/60 border border-white/20" />
                    <div className="hidden text-sm font-semibold sm:block">Hi, Dave Mattew</div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <Settings className="h-4 w-4" />
                        <span className="hidden sm:block">Setting</span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            <VehicleModal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                onCreated={onVehicleCreated}
            />
        </header>
    )
}
