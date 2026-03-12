"use client"

import { useState } from "react"
import { AlertTriangle, Siren, TriangleAlert, ShieldAlert, Filter } from "lucide-react"
import { useGetAlertSummaryQuery } from "@/redux/api/gpsHistoryApi"
import { ReportFilterBar, ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"

export function AlertSummaryPage({
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

    const isValidVehicle = filters.vehicleId !== "all" && filters.vehicleId !== ""

    const { data, isFetching, error } = useGetAlertSummaryQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to },
        { skip: !isValidVehicle }
    )

    const alertData = data?.data
    const latestAlerts = alertData?.latestAlerts ?? []

    // Group latest alerts by name to get correct latest timestamps
    const latestByType = latestAlerts.reduce((acc: Record<string, string>, alert: { alertName?: string; gpsTimestamp?: string }) => {
        if (alert.alertName && !acc[alert.alertName]) {
            acc[alert.alertName] = alert.gpsTimestamp || ""
        }
        return acc
    }, {})

    const rows = Object.entries(alertData?.alertCountsByType || {}).map(([type, count]) => ({
        type,
        count,
        latestTimestamp: latestByType[type] || "",
    }))

    const selectedVehicleObj = vehicles.find((v) => v._id === filters.vehicleId || v.id === filters.vehicleId)

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="border-b border-[#d8e6d2] px-6 py-2">
                <h2 className="text-sm font-bold text-slate-600">Alert Summary Report</h2>
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
                        <ShieldAlert className="mb-4 h-12 w-12 opacity-20" />
                        <p className="font-semibold text-base text-[#2f8d35]">Select a specific vehicle to view alert summary</p>
                    </div>
                ) : isFetching ? (
                    <div className="flex h-full items-center justify-center font-semibold text-slate-500">
                        Loading alert summary...
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center font-semibold text-red-500">
                        Error fetching alert summary.
                    </div>
                ) : (
                    <div className="flex flex-col h-full">
                        {/* Summary Cards Row (Compact) */}
                        <div className="flex gap-4 p-4 bg-[#fcfdfc] border-b border-[#ececec]">
                            {[
                                { label: "Overspeed", value: alertData?.overspeedCount || 0, icon: AlertTriangle, tone: "text-[#ef5b4d]" },
                                { label: "Low Battery", value: alertData?.lowBatteryCount || 0, icon: TriangleAlert, tone: "text-[#f3a338]" },
                                { label: "Emergency", value: alertData?.emergencyCount || 0, icon: Siren, tone: "text-[#2f8d35]" },
                            ].map((card) => (
                                <div key={card.label} className="flex-1 flex items-center justify-between gap-4 rounded-lg border border-[#d8e6d2] bg-white p-3 shadow-sm">
                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{card.label}</p>
                                        <p className="mt-1 text-xl font-black text-[#1f3b1f]">{card.value}</p>
                                    </div>
                                    <card.icon className={`h-4 w-4 ${card.tone}`} />
                                </div>
                            ))}
                        </div>

                        <table className="min-w-full border-collapse text-left">
                            <thead className="sticky top-0 z-10 bg-[#2f8d35] text-white">
                                <tr>
                                    <th className="border border-white/20 p-2 w-10"><Filter size={12} /></th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Alert Type</th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Count</th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Latest Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                {rows.length ? rows.map((row, idx) => (
                                    <tr key={row.type} className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                        <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">{idx + 1}</td>
                                        <td className="border border-[#ececec] p-2 font-bold text-slate-800">{row.type}</td>
                                        <td className="border border-[#ececec] p-2 text-center font-black text-slate-900 bg-[#fcfdfc]">{Number(row.count || 0)}</td>
                                        <td className="border border-[#ececec] p-2 text-center text-slate-600">
                                            {row.latestTimestamp ? new Date(row.latestTimestamp).toLocaleString() : "N/A"}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={4} className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">
                                            No alerts found for the selected range.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
