"use client"

import { useState, useMemo } from "react"
import { ReportFilterBar, ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"
import { useGetTravelSummaryQuery } from "@/redux/api/gpsHistoryApi"
import { Activity, Filter, MapPin, Navigation } from "lucide-react"
import React from "react"

export function DaywiseDistancePage({
    organizations,
    vehicles,
    userRole,
    userOrgId,
}: {
    organizations: any[]
    vehicles: any[]
    userRole: string | null
    userOrgId: string | null
}) {
    const [filters, setFilters] = useState<ReportFilterState>(getDefaultReportFilter())

    const { data, isFetching, error } = useGetTravelSummaryQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to }
    )

    const vehiclesSummary = (data?.data?.trips || []) as any[]

    // Generate columns based on date range
    const columns = useMemo(() => {
        const start = new Date(filters.from)
        const end = new Date(filters.to)
        const dates = []
        const curr = new Date(start)

        // Safety break
        let limit = 0
        while (curr <= end && limit < 62) {
            dates.push(new Date(curr).toISOString().split('T')[0])
            curr.setDate(curr.getDate() + 1)
            limit++
        }
        return dates
    }, [filters.from, filters.to])

    const formatDateToDD = (dateStr: string) => {
        return dateStr.split('-')[2]
    }

    const formatDateToDDMMYYYY = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-')
        return `${d}-${m}-${y}`
    }

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="bg-[#2f8d35] px-6 py-2">
                <h2 className="text-sm font-black text-white uppercase tracking-widest">Daywise Distance Report</h2>
            </div>

            <ReportFilterBar
                organizations={organizations}
                vehicles={vehicles}
                userRole={userRole}
                userOrgId={userOrgId}
                value={filters}
                onApply={setFilters}
            />

            <div className="flex-1 overflow-auto">
                {isFetching ? (
                    <div className="flex h-full flex-col items-center justify-center bg-slate-50">
                        <div className="animate-spin h-8 w-8 border-4 border-[#2f8d35]/20 border-t-[#2f8d35] rounded-full mb-4"></div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compiling Analytics...</p>
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center text-red-500 bg-slate-50 p-6 text-center">
                        <div className="max-w-xs">
                            <Activity className="h-10 w-10 mx-auto mb-4 opacity-20" />
                            <p className="text-xs font-bold uppercase tracking-widest">Failed to fetch daywise statistics. Please try a different range.</p>
                        </div>
                    </div>
                ) : vehiclesSummary.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-slate-50 p-10">
                        <Navigation className="mb-4 h-12 w-12 opacity-10" />
                        <p className="text-xs font-black uppercase tracking-[0.2em]">No Movement Records found for this period</p>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 min-h-full">
                        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-[10px] text-slate-600">
                                    <thead>
                                        <tr className="bg-[#2f8d35] text-white">
                                            <th className="border border-white/10 p-2 text-center w-6"><Filter size={10} /></th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Branch</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Vehicle</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Vehicle Brand</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Vehicle Model</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center bg-white/10">Total Distance</th>
                                            {/* Date Columns */}
                                            {columns.map(date => (
                                                <th key={date} className="border border-white/10 p-2 font-bold text-center min-w-[32px]">
                                                    {formatDateToDD(date)}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vehiclesSummary.map((vehicle, vIdx) => (
                                            <tr key={vehicle.vehicleId || vIdx} className="hover:bg-emerald-50/30 transition-colors border-b border-slate-100">
                                                <td className="p-2 text-center text-[#2f8d35] font-bold border-r border-slate-100 bg-slate-50/50">{vIdx + 1}</td>
                                                <td className="p-2 uppercase text-center font-medium">{vehicle.branchName || "-"}</td>
                                                <td className="p-2 font-black text-slate-900 text-center tracking-tight bg-white border-x border-slate-100">{vehicle.vehicleNumber}</td>
                                                <td className="p-2 text-center text-slate-500">{vehicle.brand || "-"}</td>
                                                <td className="p-2 text-center text-slate-500">{vehicle.model || "-"}</td>
                                                <td className="p-2 font-black text-[#2f8d35] text-center bg-[#f0f9ef]">
                                                    {Number(vehicle.distance || 0).toFixed(0)}
                                                </td>

                                                {/* Daily distance cells */}
                                                {columns.map(date => {
                                                    const ddmm = formatDateToDDMMYYYY(date)
                                                    const dayData = vehicle.dailyBreakdown?.find((d: any) => d.date === ddmm)
                                                    const distance = dayData?.distance || 0
                                                    const hasDistance = distance > 0

                                                    return (
                                                        <td
                                                            key={date}
                                                            className={`border border-slate-100 p-2 text-center transition-all ${hasDistance
                                                                    ? "bg-[#0b78b8] text-white font-black scale-[0.98] shadow-inner"
                                                                    : "text-slate-300 font-medium"
                                                                }`}
                                                            title={hasDistance ? `${distance.toFixed(2)} km on ${ddmm}` : ""}
                                                        >
                                                            {hasDistance ? Math.round(distance) : "0"}
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
