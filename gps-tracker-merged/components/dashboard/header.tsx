"use client"

import { useState } from "react"
import { Menu, Settings, MessageSquare, Bell, Calendar, Clock, Car, LogOut, Building2, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [modalType, setModalType] = useState<"branch" | "org">("branch")
    const [name, setName] = useState("")
    const [location, setLocation] = useState("")

    const openModal = (type: "branch" | "org") => {
        setModalType(type)
        setIsModalOpen(true)
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setIsModalOpen(false)
        setName("")
        setLocation("")
    }

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
                        onClick={() => openModal("branch")}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add Branch
                    </Button>
                    <Button
                        variant="outline"
                        className="h-9 rounded-full border-white/20 bg-white/5 px-4 text-xs font-semibold uppercase tracking-wide text-white hover:bg-white/10"
                        onClick={() => openModal("org")}
                    >
                        <Building2 className="mr-2 h-4 w-4" /> Add Org
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

            {isModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.6)]">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">
                                    Ajiva Tracker
                                </div>
                                <h2 className="text-xl font-semibold text-white">
                                    {modalType === "branch" ? "Add Branch" : "Add Organisation"}
                                </h2>
                            </div>
                            <button
                                className="rounded-full border border-white/10 p-2 text-slate-300 hover:bg-white/10"
                                onClick={() => setIsModalOpen(false)}
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                    {modalType === "branch" ? "Branch Name" : "Organisation Name"}
                                </label>
                                <input
                                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                                    placeholder={modalType === "branch" ? "Enter branch name" : "Enter organisation name"}
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs uppercase tracking-[0.3em] text-slate-400">
                                    Location
                                </label>
                                <input
                                    className="h-11 w-full rounded-xl border border-white/10 bg-slate-900/70 px-4 text-sm text-white placeholder:text-slate-500 focus:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-400/20"
                                    placeholder="City, State"
                                    value={location}
                                    onChange={(event) => setLocation(event.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 rounded-full border-white/10 bg-white/5 px-5 text-xs font-semibold uppercase tracking-wide text-slate-200 hover:bg-white/10"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    className="h-10 rounded-full bg-emerald-400 px-6 text-xs font-semibold uppercase tracking-wide text-slate-950 hover:bg-emerald-300"
                                >
                                    Save
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </header>
    )
}
