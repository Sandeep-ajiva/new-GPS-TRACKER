"use client"

import { useState } from "react"
import { ReportFilterBar, ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"
import { useGetDaywiseDistanceQuery } from "@/redux/api/gpsHistoryApi"
import { CalendarRange, Activity, Filter } from "lucide-react"

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

    // Pass skip: true if no specific vehicle is selected (e.g. 'all')
    const isValidVehicle = filters.vehicleId !== "all" && filters.vehicleId !== ""

    const { data, isFetching, error } = useGetDaywiseDistanceQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to },
        { skip: !isValidVehicle }
    )

    const days = data?.data?.days || []
    const selectedVehicleObj = vehicles.find((v) => v._id === filters.vehicleId || v.id === filters.vehicleId)

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="border-b border-[#d8e6d2] px-6 py-2">
                <h2 className="text-sm font-bold text-slate-600">Daywise Distance Report</h2>
            </div>

            <ReportFilterBar
                organizations={organizations}
                vehicles={vehicles}
                userRole={userRole}
                userOrgId={userOrgId}
                value={filters}
                onApply={setFilters}
            />

            <div className="flex-1 overflow-auto text-[10px]">
                {!isValidVehicle ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-500">
                        <Activity className="mb-4 h-12 w-12 opacity-20" />
                        <p className="font-semibold text-base text-[#2f8d35]">Select a specific vehicle to view daywise distance</p>
                    </div>
                ) : isFetching ? (
                    <div className="flex h-full items-center justify-center font-semibold text-slate-500">
                        Loading daywise data...
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center font-semibold text-red-500">
                        Error fetching daywise distance data.
                    </div>
                ) : (
                    <table className="min-w-full border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-[#2f8d35] text-white">
                            <tr>
                                <th className="border border-white/20 p-2 w-10"><Filter size={12} /></th>
                                <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Date</th>
                                <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Vehicle Number</th>
                                <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Distance (KM)</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            {days.length > 0 ? days.map((day: { date: string, distance: number }, index: number) => (
                                <tr key={`${day.date}-${index}`} className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                    <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">{index + 1}</td>
                                    <td className="border border-[#ececec] p-2 text-center font-bold text-slate-900">{day.date}</td>
                                    <td className="border border-[#ececec] p-2 text-center font-semibold text-slate-700">{selectedVehicleObj?.vehicleNumber || filters.vehicleId}</td>
                                    <td className="border border-[#ececec] p-2 text-center font-black text-slate-900 bg-[#fcfdfc]">{Number(day.distance || 0).toFixed(2)} km</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">
                                        No records found for the selected range
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
