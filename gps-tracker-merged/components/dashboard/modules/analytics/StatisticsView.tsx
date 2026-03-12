"use client"

import { useState } from "react"
import { CalendarRange, Gauge, Route } from "lucide-react"
import { useDashboardContext } from "@/components/dashboard/DashboardContext"
import { useGetDaywiseDistanceQuery, useGetStatisticsQuery } from "@/redux/api/gpsHistoryApi"
import {
    AnalyticsFilterModal,
    AnalyticsFilterState,
    getDefaultAnalyticsFilter,
} from "./AnalyticsFilterModal"

const formatDuration = (seconds?: number) => {
    const total = Math.max(0, Number(seconds || 0))
    const hrs = String(Math.floor(total / 3600)).padStart(2, "0")
    const mins = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
    const secs = String(total % 60).padStart(2, "0")
    return `${hrs}:${mins}:${secs}`
}

export function StatisticsView({
    mode = "statistics",
}: {
    mode?: "statistics" | "daywise"
}) {
    const { selectedVehicle } = useDashboardContext()
    const [filters, setFilters] = useState<AnalyticsFilterState>(getDefaultAnalyticsFilter())
    const [showFilters, setShowFilters] = useState(false)
    const vehicleId = selectedVehicle?.id || ""

    const statisticsQuery = useGetStatisticsQuery(
        { vehicleId, from: filters.from, to: filters.to },
        { skip: !vehicleId || mode !== "statistics" },
    )

    const daywiseQuery = useGetDaywiseDistanceQuery(
        { vehicleId, from: filters.from, to: filters.to },
        { skip: !vehicleId || mode !== "daywise" },
    )

    const statistics = statisticsQuery.data?.data
    const daywiseRows = daywiseQuery.data?.data?.days ?? []
    const totalDaywiseDistance = daywiseRows.reduce((sum: number, row: { distance?: number }) => sum + Number(row.distance || 0), 0)

    if (!selectedVehicle) {
        return (
            <div className="rounded-[28px] border border-[#d8e6d2] bg-[#f7fbf5] p-8 text-center text-sm font-semibold text-slate-500">
                Select a vehicle from the sidebar to open analytics.
            </div>
        )
    }

    return (
        <>
            <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-[#d8e6d2] bg-[#f7fbf5] p-5">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">
                            {mode === "statistics" ? "Statistics" : "Daywise Distance"}
                        </p>
                        <h3 className="mt-1 text-2xl font-black text-[#1f3b1f]">{selectedVehicle.vehicleNumber || selectedVehicle.id}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {filters.from} to {filters.to}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowFilters(true)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#d8e6d2] bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-[#eef8ec] hover:text-[#2f8d35]"
                    >
                        <CalendarRange className="h-4 w-4 text-[#38a63c]" />
                        Filters
                    </button>
                </div>

                {mode === "statistics" ? (
                    <>
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            {[
                                { label: "Total Distance", value: `${Number(statistics?.totalDistance || 0).toFixed(2)} km`, icon: Route },
                                { label: "Average Speed", value: `${Number(statistics?.avgSpeed || 0).toFixed(1)} km/h`, icon: Gauge },
                                { label: "Max Speed", value: `${Number(statistics?.maxSpeed || 0).toFixed(1)} km/h`, icon: Gauge },
                                { label: "Running Time", value: formatDuration(statistics?.runningTime), icon: CalendarRange },
                                { label: "Idle Time", value: formatDuration(statistics?.idleTime), icon: CalendarRange },
                                { label: "Ignition On Count", value: String(statistics?.ignitionOnCount || 0), icon: CalendarRange },
                            ].map((card) => (
                                <div key={card.label} className="rounded-[24px] border border-[#d8e6d2] bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">{card.label}</p>
                                            <p className="mt-3 text-2xl font-black text-[#1f3b1f]">{card.value}</p>
                                        </div>
                                        <card.icon className="h-5 w-5 text-[#38a63c]" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-[#d8e6d2] bg-white shadow-sm">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-[#f7fbf5] text-slate-500">
                                    <tr>
                                        {["Metric", "Value"].map((heading) => (
                                            <th key={heading} className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em]">{heading}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        ["Total Distance", `${Number(statistics?.totalDistance || 0).toFixed(2)} km`],
                                        ["Average Speed", `${Number(statistics?.avgSpeed || 0).toFixed(1)} km/h`],
                                        ["Max Speed", `${Number(statistics?.maxSpeed || 0).toFixed(1)} km/h`],
                                        ["Running Time", formatDuration(statistics?.runningTime)],
                                        ["Idle Time", formatDuration(statistics?.idleTime)],
                                        ["Ignition On Count", String(statistics?.ignitionOnCount || 0)],
                                    ].map(([label, value]) => (
                                        <tr key={label} className="border-t border-[#edf3e8]">
                                            <td className="px-5 py-4 font-semibold text-slate-600">{label}</td>
                                            <td className="px-5 py-4 font-black text-slate-900">{value}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="rounded-[24px] border border-[#d8e6d2] bg-white p-5 shadow-sm">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Days Covered</p>
                                <p className="mt-3 text-3xl font-black text-[#1f3b1f]">{daywiseRows.length}</p>
                            </div>
                            <div className="rounded-[24px] border border-[#d8e6d2] bg-white p-5 shadow-sm">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">Total Distance</p>
                                <p className="mt-3 text-3xl font-black text-[#1f3b1f]">{totalDaywiseDistance.toFixed(2)} km</p>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-[28px] border border-[#d8e6d2] bg-white shadow-sm">
                            <table className="min-w-full text-left text-sm">
                                <thead className="bg-[#f7fbf5] text-slate-500">
                                    <tr>
                                        <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em]">Date</th>
                                        <th className="px-5 py-4 text-[11px] font-black uppercase tracking-[0.22em]">Distance</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {daywiseRows.length ? daywiseRows.map((row: { date: string; distance?: number }) => (
                                        <tr key={row.date} className="border-t border-[#edf3e8]">
                                            <td className="px-5 py-4 font-semibold text-slate-700">{row.date}</td>
                                            <td className="px-5 py-4 font-black text-slate-900">{Number(row.distance || 0).toFixed(2)} km</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={2} className="px-5 py-8 text-center font-semibold text-slate-500">
                                                No distance records found for the selected range.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <AnalyticsFilterModal
                key={`${filters.preset}-${filters.from}-${filters.to}`}
                isOpen={showFilters}
                vehicleLabel={selectedVehicle.vehicleNumber || selectedVehicle.id}
                value={filters}
                onClose={() => setShowFilters(false)}
                onApply={(next) => {
                    setFilters(next)
                    setShowFilters(false)
                }}
            />
        </>
    )
}
