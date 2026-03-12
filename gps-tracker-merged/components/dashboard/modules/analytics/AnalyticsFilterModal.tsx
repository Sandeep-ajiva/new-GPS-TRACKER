"use client"

import { useState, useMemo } from "react"
import { X, Search, Filter, ArrowUpDown } from "lucide-react"
import { ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"

export type AnalyticsFilterState = ReportFilterState
export const getDefaultAnalyticsFilter = getDefaultReportFilter

interface AnalyticsFilterModalProps {
    isOpen: boolean
    onClose: () => void
    organizations?: any[]
    vehicles?: any[]
    value: ReportFilterState
    onApply: (next: ReportFilterState) => void
    vehicleLabel?: string
}

export function AnalyticsFilterModal({
    isOpen,
    onClose,
    organizations = [],
    vehicles = [],
    value,
    onApply,
    vehicleLabel,
}: AnalyticsFilterModalProps) {
    const [draft, setDraft] = useState<ReportFilterState>(value)

    const uniqueBrands = useMemo(() => {
        const brands = new Set<string>()
        vehicles.forEach(v => {
            const b = v.brand || v.make || v.vehicleBrand
            if (b) brands.add(b)
        })
        return Array.from(brands).sort()
    }, [vehicles])

    const uniqueModels = useMemo(() => {
        const models = new Set<string>()
        vehicles.forEach(v => {
            const b = v.brand || v.make || v.vehicleBrand
            const m = v.model || v.vehicleModel
            if (draft.brand !== "all" && b !== draft.brand) return
            if (m) models.add(m)
        })
        return Array.from(models).sort()
    }, [vehicles, draft.brand])

    const uniqueTypes = useMemo(() => {
        const types = new Set<string>()
        vehicles.forEach(v => {
            if (v.vehicleType) types.add(v.vehicleType)
        })
        return Array.from(types).sort()
    }, [vehicles])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#f5f5f5] shadow-2xl">
                {/* Header with Search/Filter/Sort Tabs */}
                <div className="flex border-b border-gray-200 bg-white">
                    <div className="flex flex-1 items-center gap-4 p-4">
                        <button className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 shadow-sm transition hover:bg-gray-50">
                            <Search size={24} />
                        </button>
                        <button className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-100 bg-[#38a63c] text-white shadow-sm transition hover:bg-[#2f8d35]">
                            <Filter size={24} />
                        </button>
                        <button className="flex h-12 w-12 items-center justify-center rounded-lg border border-gray-100 bg-white text-gray-400 shadow-sm transition hover:bg-gray-50">
                            <ArrowUpDown size={24} />
                        </button>
                    </div>
                    <button onClick={onClose} className="p-4 text-gray-400 hover:text-red-500 transition">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="grid grid-cols-1 gap-y-6 p-8 sm:grid-cols-2 sm:gap-x-8">
                    {/* Organization / Company */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-600">Company :</label>
                        <select
                            value={draft.organizationId}
                            onChange={(e) => setDraft(prev => ({ ...prev, organizationId: e.target.value, vehicleId: "all" }))}
                            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c]"
                        >
                            <option value="all">All</option>
                            {organizations.map(org => (
                                <option key={org._id} value={org._id}>{org.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Vehicle Brand */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-600">Vehicle Brand :</label>
                        <select
                            value={draft.brand}
                            onChange={(e) => setDraft(prev => ({ ...prev, brand: e.target.value, model: "all" }))}
                            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c]"
                        >
                            <option value="all">All</option>
                            {uniqueBrands.map(brand => (
                                <option key={brand} value={brand}>{brand}</option>
                            ))}
                        </select>
                    </div>

                    {/* Branch */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-600">Branch :</label>
                        <select
                            value={draft.branch}
                            onChange={(e) => setDraft(prev => ({ ...prev, branch: e.target.value }))}
                            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c]"
                        >
                            <option value="all">All</option>
                            <option value="Main">Main Branch</option>
                            <option value="North">North Region</option>
                            <option value="South">South Region</option>
                        </select>
                    </div>

                    {/* Vehicle Model */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-600">Vehicle Model :</label>
                        <select
                            value={draft.model}
                            onChange={(e) => setDraft(prev => ({ ...prev, model: e.target.value }))}
                            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c] border-[#2f8d35] ring-1 ring-[#2f8d35]"
                        >
                            <option value="all">All</option>
                            {uniqueModels.map(model => (
                                <option key={model} value={model}>{model}</option>
                            ))}
                        </select>
                    </div>

                    {/* Vehicle Type */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-semibold text-gray-600">Vehicle Type :</label>
                        <select
                            value={draft.vehicleType}
                            onChange={(e) => setDraft(prev => ({ ...prev, vehicleType: e.target.value }))}
                            className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c]"
                        >
                            <option value="all">All</option>
                            {uniqueTypes.map(t => (
                                <option key={t} value={t}>{t}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Fields */}
                    <div className="flex gap-4">
                        <div className="flex flex-1 flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-600">From Date :</label>
                            <input
                                type="date"
                                value={draft.from}
                                onChange={(e) => setDraft(p => ({ ...p, from: e.target.value }))}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c]"
                            />
                        </div>
                        <div className="flex flex-1 flex-col gap-1.5">
                            <label className="text-sm font-semibold text-gray-600">To Date :</label>
                            <input
                                type="date"
                                value={draft.to}
                                onChange={(e) => setDraft(p => ({ ...p, to: e.target.value }))}
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#38a63c] focus:outline-none focus:ring-1 focus:ring-[#38a63c]"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-4 p-8 pt-0">
                    <button
                        onClick={() => onApply(draft)}
                        className="flex-1 rounded-md bg-[#2f8d35] py-3 font-bold text-white shadow-lg transition hover:bg-[#26732b]"
                    >
                        Apply
                    </button>
                    <button
                        onClick={() => {
                            const def = { ...value, brand: 'all', model: 'all', branch: 'all', vehicleType: 'all', organizationId: 'all' }
                            setDraft(def)
                        }}
                        className="flex-1 rounded-md bg-gray-400 py-3 font-bold text-white shadow-lg transition hover:bg-gray-500"
                    >
                        Set Default Filter
                    </button>
                </div>
            </div>
        </div>
    )
}
