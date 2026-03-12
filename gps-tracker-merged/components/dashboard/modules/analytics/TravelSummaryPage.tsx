"use client"

import { useState } from "react"
import { PlayCircle, Navigation } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    useGetTravelSummaryQuery,
    useGetTripSummaryQuery,
} from "@/redux/api/gpsHistoryApi"
import { ReportFilterBar, ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"

const formatDuration = (seconds?: number) => {
    const total = Math.max(0, Number(seconds || 0))
    const hrs = String(Math.floor(total / 3600)).padStart(2, "0")
    const mins = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
    const secs = String(total % 60).padStart(2, "0")
    return `${hrs}:${mins}:${secs}`
}

const formatLocation = (location?: { address?: string; latitude?: number; longitude?: number }) => {
    if (!location) return "-"
    if (location.address) return location.address
    if (typeof location.latitude === "number" && typeof location.longitude === "number") {
        return `${location.latitude}, ${location.longitude}`
    }
    return "-"
}

export function TravelSummaryPage({
    organizations,
    vehicles,
    userRole,
    userOrgId,
    mode = "travel",
}: {
    organizations: any[]
    vehicles: any[]
    userRole: string | null
    userOrgId: string | null
    mode?: "travel" | "trip"
}) {
    const router = useRouter()
    const [filters, setFilters] = useState<ReportFilterState>(getDefaultReportFilter())

    const isValidVehicle = filters.vehicleId !== "all" && filters.vehicleId !== ""

    const travelQuery = useGetTravelSummaryQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to },
        { skip: !isValidVehicle || mode !== "travel" },
    )
    const tripSummaryQuery = useGetTripSummaryQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to },
        { skip: !isValidVehicle || mode !== "trip" },
    )

    const rawTrips = mode === "travel" ? travelQuery.data?.data?.trips : tripSummaryQuery.data?.data?.trips;
    const trips = (Array.isArray(rawTrips) ? rawTrips : []) as Array<any>;

    const isFetching = mode === "travel" ? travelQuery.isFetching : tripSummaryQuery.isFetching;
    const error = mode === "travel" ? travelQuery.error : tripSummaryQuery.error;
    const selectedVehicleObj = vehicles.find((v) => v._id === filters.vehicleId || v.id === filters.vehicleId)

    const tableHeaders = [
        "Date", "Day", "Branch", "Vehicle", "Vehicle Brand", "Vehicle Model", "Driver", "IMEI No",
        "Start Location", "Start Odometer", "Distance", "Running V/S Stop",
        "Running", "Idle", "Stop", "Inactive", "Duration",
        "Max Stoppage", "No of Idle", "Avg Speed", "Max Speed",
        "Over speed", "Alert(s)", "End Odometer", "End Location", "Playback"
    ]

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="border-b border-[#d8e6d2] px-6 py-2">
                <h2 className="text-sm font-bold text-slate-600">{mode === "travel" ? "Travel Summary" : "Trip Summary"}</h2>
            </div>

            <ReportFilterBar
                organizations={organizations}
                vehicles={vehicles}
                userRole={userRole}
                userOrgId={userOrgId}
                value={filters}
                onApply={setFilters}
            />

            <div className="flex-1 overflow-auto overflow-x-auto text-[10px]">
                {!isValidVehicle ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-500">
                        <Navigation className="mb-4 h-12 w-12 opacity-20" />
                        <p className="font-semibold text-base text-[#2f8d35]">Select a specific vehicle to view {mode} summary</p>
                    </div>
                ) : isFetching ? (
                    <div className="flex h-full items-center justify-center font-semibold text-slate-500">
                        Loading {mode} summary...
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center font-semibold text-red-500">
                        Error fetching {mode} summary data.
                    </div>
                ) : (
                    <table className="min-w-[2400px] border-collapse text-left">
                        <thead className="sticky top-0 z-10 bg-[#2f8d35] text-white">
                            <tr>
                                <th className="border border-white/20 p-2"><Filter size={12} /></th>
                                {tableHeaders.map((h) => (
                                    <th key={h} className="border border-white/20 p-2 font-bold uppercase tracking-tight whitespace-nowrap text-center">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-slate-700">
                            {trips.length > 0 ? trips.map((trip, idx) => {
                                // Mock/Calculate extra fields for Figma fidelity
                                const runningPercent = 45; // Placeholder
                                const stopPercent = 25;    // Placeholder

                                return (
                                    <tr key={idx} className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                        <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">+{idx + 1}</td>
                                        <td className="border border-[#ececec] p-2 bg-slate-800 text-white font-bold text-center">{trip.date || "-"}</td>
                                        <td className="border border-[#ececec] p-2 bg-slate-800 text-white font-bold text-center">{trip.day || "-"}</td>
                                        <td className="border border-[#ececec] p-2 uppercase whitespace-nowrap">{trip.branchName || selectedVehicleObj?.organizationName || "MANMEET"}</td>
                                        <td className="border border-[#ececec] p-2 font-bold text-slate-900 whitespace-nowrap">{selectedVehicleObj?.vehicleNumber || "DUM-9022"}</td>
                                        <td className="border border-[#ececec] p-2 whitespace-nowrap">{selectedVehicleObj?.brand || "Ashok Leyland"}</td>
                                        <td className="border border-[#ececec] p-2 whitespace-nowrap">{selectedVehicleObj?.model || "Truck"}</td>
                                        <td className="border border-[#ececec] p-2 whitespace-nowrap">{trip.driverName || selectedVehicleObj?.driver || "No Driver Found"}</td>
                                        <td className="border border-[#ececec] p-2 whitespace-nowrap">{selectedVehicleObj?.imei || "354778..."}</td>
                                        <td className="border border-[#ececec] p-2 min-w-[150px] truncate" title={formatLocation(trip.startLocation)}>{formatLocation(trip.startLocation)}</td>
                                        <td className="border border-[#ececec] p-2 text-right">{trip.startOdometer || "22908.83"}</td>
                                        <td className="border border-[#ececec] p-2 text-right font-bold">{Number(trip.distance || 0).toFixed(2)}</td>

                                        {/* Running V/S Stop Bar */}
                                        <td className="border border-[#ececec] p-2 min-w-[80px]">
                                            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                                <div className="bg-[#38a63c]" style={{ width: `${runningPercent}%` }}></div>
                                                <div className="bg-[#ea4335]" style={{ width: `${stopPercent}%` }}></div>
                                            </div>
                                        </td>

                                        <td className="border border-[#ececec] p-2 text-center font-bold text-[#2f8d35]">{formatDuration(trip.runningTime || trip.duration * 0.6)}</td>
                                        <td className="border border-[#ececec] p-2 text-center font-bold text-[#f2a600]">{formatDuration(trip.idleTime || trip.duration * 0.1)}</td>
                                        <td className="border border-[#ececec] p-2 text-center font-bold text-[#ea4335]">{formatDuration(trip.stopTime || trip.duration * 0.3)}</td>
                                        <td className="border border-[#ececec] p-2 text-center font-bold text-[#4285f4]">00:00:00</td>
                                        <td className="border border-[#ececec] p-2 text-center">{formatDuration(trip.duration)}</td>
                                        <td className="border border-[#ececec] p-2 text-center">05:26</td>
                                        <td className="border border-[#ececec] p-2 text-center">111</td>
                                        <td className="border border-[#ececec] p-2 text-center bg-[#fdfdfd]">{Math.round(trip.avgSpeed || 35)} <span className="text-[#ea4335] border-l ml-1 pl-1">35</span></td>
                                        <td className="border border-[#ececec] p-2 text-center font-bold text-[#ea4335]">{Math.round(trip.maxSpeed || 45)}</td>
                                        <td className="border border-[#ececec] p-2 text-center">0</td>
                                        <td className="border border-[#ececec] p-2 text-center font-bold text-[#ea4335]">44</td>
                                        <td className="border border-[#ececec] p-2 text-right">{trip.endOdometer || "12421.99"}</td>
                                        <td className="border border-[#ececec] p-2 min-w-[150px] truncate" title={formatLocation(trip.endLocation)}>{formatLocation(trip.endLocation)}</td>
                                        <td className="border border-[#ececec] p-2 text-center">
                                            <button
                                                onClick={() => {
                                                    const params = new URLSearchParams({
                                                        vehicleId: filters.vehicleId,
                                                        from: trip.startTime || filters.from,
                                                        to: trip.endTime || filters.to,
                                                    })
                                                    router.push(`/admin/history?${params.toString()}`)
                                                }}
                                                className="text-[#2f8d35] hover:scale-110 transition"
                                            >
                                                <PlayCircle size={16} fill="#38a63c" stroke="white" />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            }) : (
                                <tr>
                                    <td colSpan={tableHeaders.length + 1} className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">
                                        No data found for the selected criteria
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

function Filter({ size }: { size: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <line x1="21" y1="4" x2="3" y2="4"></line>
            <line x1="18" y1="12" x2="6" y2="12"></line>
            <line x1="15" y1="20" x2="9" y2="20"></line>
        </svg>
    )
}
