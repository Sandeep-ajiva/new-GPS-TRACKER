"use client"

import { useMemo, useState, useEffect } from "react"
import { Building2, CalendarRange, Car, Filter, ChevronDown, Search } from "lucide-react"
import { AnalyticsFilterModal } from "./AnalyticsFilterModal"

export type ReportFilterState = {
    organizationId: string
    vehicleId: string
    from: string
    to: string
    brand?: string
    model?: string
    branch?: string
    vehicleType?: string
    preset?: string
}

const formatDate = (date: Date) => {
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, "0")
    const dd = String(date.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
}

const getYesterday = () => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return formatDate(d)
}

const getLastWeek = () => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return { from: formatDate(d), to: formatDate(new Date()) }
}

const getLastMonth = () => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return { from: formatDate(d), to: formatDate(new Date()) }
}

export function getDefaultReportFilter(): ReportFilterState {
    const today = formatDate(new Date())
    return {
        organizationId: "all",
        vehicleId: "all",
        from: today,
        to: today,
        brand: "all",
        model: "all",
        branch: "all",
        vehicleType: "all"
    }
}

export function ReportFilterBar({
    organizations,
    vehicles,
    userRole,
    userOrgId,
    value,
    onApply,
}: {
    organizations: any[]
    vehicles: any[]
    userRole: string | null
    userOrgId: string | null
    value: ReportFilterState
    onApply: (next: ReportFilterState) => void
}) {
    const [draft, setDraft] = useState<ReportFilterState>(value)
    const [isAdvancedModalOpen, setIsAdvancedModalOpen] = useState(false)

    const normalizedRole = userRole?.toLowerCase() || "user"
    const isSuperAdmin = normalizedRole === "superadmin" || normalizedRole === "root"
    const isAdmin = normalizedRole === "admin"

    useEffect(() => {
        if (!isSuperAdmin && isAdmin && organizations.length === 1 && draft.organizationId !== organizations[0]._id) {
            setDraft(prev => ({ ...prev, organizationId: organizations[0]._id }))
        } else if (!isSuperAdmin && !isAdmin && userOrgId && draft.organizationId !== userOrgId) {
            setDraft(prev => ({ ...prev, organizationId: userOrgId }))
        }
    }, [isSuperAdmin, isAdmin, organizations, userOrgId, draft.organizationId])

    const showOrgSelector = isSuperAdmin || (isAdmin && organizations.length > 1)

    const availableVehicles = useMemo(() => {
        let filtered = vehicles;

        // Filter by organization
        if (draft.organizationId && draft.organizationId !== "all") {
            filtered = filtered.filter(v => (v.organizationId?._id || v.organizationId) === draft.organizationId)
        } else if (!isSuperAdmin && userOrgId) {
            filtered = filtered.filter(v => (v.organizationId?._id || v.organizationId) === userOrgId)
        }

        // Filter by advanced attributes if present
        if (draft.brand && draft.brand !== "all") {
            filtered = filtered.filter(v => (v.brand || v.make || v.vehicleBrand) === draft.brand)
        }
        if (draft.model && draft.model !== "all") {
            filtered = filtered.filter(v => (v.model || v.vehicleModel) === draft.model)
        }
        if (draft.branch && draft.branch !== "all") {
            filtered = filtered.filter(v => v.branch === draft.branch)
        }
        if (draft.vehicleType && draft.vehicleType !== "all") {
            filtered = filtered.filter(v => v.vehicleType === draft.vehicleType)
        }

        return filtered
    }, [vehicles, draft.organizationId, draft.brand, draft.model, draft.branch, draft.vehicleType, isSuperAdmin, userOrgId])

    const applyPreset = (preset: "yesterday" | "week" | "month") => {
        if (preset === "yesterday") {
            const y = getYesterday()
            const next = { ...draft, from: y, to: y }
            setDraft(next)
            onApply(next)
        } else if (preset === "week") {
            const w = getLastWeek()
            const next = { ...draft, ...w }
            setDraft(next)
            onApply(next)
        } else if (preset === "month") {
            const m = getLastMonth()
            const next = { ...draft, ...m }
            setDraft(next)
            onApply(next)
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-0 border border-[#d8e6d2] bg-white text-sm">
            {/* FIGMA STYLE COMPACT FILTER BAR */}

            <div className="flex items-center gap-1 border-r border-[#d8e6d2] px-2 py-2">
                <button
                    onClick={() => setIsAdvancedModalOpen(true)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-[#d8e6d2] bg-white text-slate-500 hover:bg-slate-50 shadow-sm"
                >
                    <Search size={16} />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded border border-[#d8e6d2] bg-[#38a63c] text-white shadow-sm">
                    <Filter size={16} />
                </button>
            </div>

            <div className="flex items-center gap-4 px-6 border-r border-[#d8e6d2] h-[44px]">
                <button
                    onClick={() => applyPreset("yesterday")}
                    className="text-[#2f8d35] font-bold hover:underline"
                >
                    Yesterday
                </button>
                <button
                    onClick={() => applyPreset("week")}
                    className="text-[#2f8d35] font-bold hover:underline"
                >
                    Last Week
                </button>
                <button
                    onClick={() => applyPreset("month")}
                    className="text-[#2f8d35] font-bold hover:underline"
                >
                    Last Month
                </button>
            </div>

            {showOrgSelector && (
                <div className="flex items-center border-r border-[#d8e6d2]">
                    <div className="flex h-[44px] items-center bg-[#f7fbf5] px-4 font-bold text-slate-500">
                        Company =
                    </div>
                    <div className="relative flex items-center bg-white px-2">
                        <select
                            value={draft.organizationId}
                            onChange={(e) => setDraft((v) => ({ ...v, organizationId: e.target.value, vehicleId: "all" }))}
                            className="appearance-none bg-transparent py-2 pl-2 pr-8 font-bold text-[#2f8d35] outline-none"
                        >
                            <option value="all">All</option>
                            {organizations.map((org) => (
                                <option key={org._id} value={org._id}>
                                    {org.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-[#2f8d35]" />
                    </div>
                </div>
            )}

            <div className="flex items-center border-r border-[#d8e6d2]">
                <div className="flex h-[44px] items-center bg-[#f7fbf5] px-4 font-bold text-slate-500">
                    Vehicle =
                </div>
                <div className="relative flex items-center bg-white px-2">
                    <select
                        value={draft.vehicleId}
                        onChange={(e) => setDraft((v) => ({ ...v, vehicleId: e.target.value }))}
                        className="appearance-none bg-transparent py-2 pl-2 pr-8 font-bold text-[#2f8d35] outline-none"
                    >
                        <option value="all">All</option>
                        {availableVehicles.map((v) => (
                            <option key={v._id || v.id} value={v._id || v.id}>
                                {v.vehicleNumber || v.id}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-[#2f8d35]" />
                </div>
            </div>

            <div className="flex items-center border-r border-[#d8e6d2]">
                <div className="flex h-[44px] items-center bg-[#f7fbf5] px-4 font-bold text-slate-500">
                    Date Range
                </div>
                <div className="flex items-center bg-[#38a63c] px-3 py-1.5 mx-2 rounded-[4px] text-white font-bold">
                    <input
                        type="date"
                        value={draft.from}
                        onChange={(e) => setDraft((v) => ({ ...v, from: e.target.value }))}
                        className="bg-transparent text-white outline-none [color-scheme:dark]"
                    />
                </div>
                <span className="font-bold text-slate-400">to</span>
                <div className="flex items-center bg-[#38a63c] px-3 py-1.5 mx-2 rounded-[4px] text-white font-bold">
                    <input
                        type="date"
                        value={draft.to}
                        onChange={(e) => setDraft((v) => ({ ...v, to: e.target.value }))}
                        className="bg-transparent text-white outline-none [color-scheme:dark]"
                    />
                </div>
            </div>

            <div className="ml-auto flex items-center pr-2">
                <button
                    type="button"
                    onClick={() => onApply(draft)}
                    className="inline-flex h-[32px] items-center gap-2 rounded-lg bg-[#38a63c] px-4 text-xs font-black text-white transition hover:bg-[#2f8d35]"
                >
                    <Filter className="h-3 w-3" />
                    Apply
                </button>
            </div>

            {isAdvancedModalOpen && (
                <AnalyticsFilterModal
                    isOpen={isAdvancedModalOpen}
                    onClose={() => setIsAdvancedModalOpen(false)}
                    organizations={organizations}
                    vehicles={vehicles}
                    value={draft}
                    onApply={(next: ReportFilterState) => {
                        setDraft(next)
                        onApply(next)
                        setIsAdvancedModalOpen(false)
                    }}
                />
            )}
        </div>
    )
}
