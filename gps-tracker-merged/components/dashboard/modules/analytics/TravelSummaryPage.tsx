"use client"

import { useState, useMemo } from "react"
import dynamic from "next/dynamic"
import { PlayCircle, Navigation, Filter as FilterIcon, History, MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    useGetTravelSummaryQuery,
    useGetTripSummaryQuery,
} from "@/redux/api/gpsHistoryApi"
import { ReportFilterBar, ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"
import React from "react"
const TravelPlaybackInline = dynamic(() => import("@/components/reports/TravelPlaybackInline"), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] w-full flex items-center justify-center bg-slate-50 border-y border-slate-200">
            <div className="flex flex-col items-center gap-2">
                <div className="animate-spin h-8 w-8 border-4 border-[#2f8d35]/20 border-t-[#2f8d35] rounded-full"></div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initializing Map...</p>
            </div>
        </div>
    )
})

const formatDuration = (seconds?: number) => {
    const total = Math.max(0, Number(seconds || 0))
    const hrs = String(Math.floor(total / 3600)).padStart(2, "0")
    const mins = String(Math.floor((total % 3600) / 60)).padStart(2, "0")
    const secs = String(total % 60).padStart(2, "0")
    return `${hrs}:${mins}:${secs}`
}

const formatLocation = (location?: { address?: string; latitude?: number; longitude?: number }) => {
    if (!location) return "-"
    let text = "-"
    if (location.address) {
        text = location.address
    } else if (typeof location.latitude === "number" && typeof location.longitude === "number") {
        text = `${location.latitude}, ${location.longitude}`
    }
    // Limit to 6 decimals
    return text.replace(/(\.\d{6})\d+/g, '$1')
}

const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).replace(/\//g, "-").replace(",", "");
};

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
    const [expandedVehicleId, setExpandedVehicleId] = useState<string | null>(null)
    const [playbackVehicleId, setPlaybackVehicleId] = useState<string | null>(null)

    const isValidVehicle = filters.vehicleId !== ""

    const travelQuery = useGetTravelSummaryQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to },
        { skip: !isValidVehicle || mode !== "travel" },
    )

    const tripQuery = useGetTripSummaryQuery(
        { vehicleId: filters.vehicleId, from: filters.from, to: filters.to },
        { skip: !isValidVehicle || mode !== "trip" },
    )

    const data = mode === "travel" ? travelQuery.data?.data : tripQuery.data?.data;
    const trips = (Array.isArray(data?.trips) ? data.trips : []) as Array<any>;
    const isFetching = mode === "travel" ? travelQuery.isFetching : tripQuery.isFetching;
    const error = mode === "travel" ? travelQuery.error : tripQuery.error;

    const renderProgressBar = (running: number, stop: number, idle: number, height: string = "h-1.5") => {
        const total = (running || 0) + (stop || 0) + (idle || 0);
        if (total === 0) return (
            <div className={`flex ${height} w-full overflow-hidden rounded-full bg-slate-100`}></div>
        );
        const runP = ((running || 0) / total) * 100;
        const stopP = ((stop || 0) / total) * 100;
        const idleP = ((idle || 0) / total) * 100;

        return (
            <div className={`flex ${height} w-full overflow-hidden rounded-full bg-slate-200 min-w-[80px]`}>
                <div className="bg-[#2f8d35]" style={{ width: `${runP}%` }}></div>
                <div className="bg-[#ea4335]" style={{ width: `${stopP}%` }}></div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 bg-[#2f8d35]/10 rounded-lg flex items-center justify-center text-[#2f8d35]">
                        <Navigation size={16} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase">
                            {mode === "travel" ? "Travel Summary" : "Trip Summary"}
                        </h2>
                    </div>
                </div>
            </div>

            <ReportFilterBar
                organizations={organizations}
                vehicles={vehicles}
                userRole={userRole}
                userOrgId={userOrgId}
                value={filters}
                onApply={setFilters}
            />

            <div className="flex-1 overflow-auto p-2">
                {!isValidVehicle ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                        <Navigation className="h-10 w-10 opacity-20 mb-4" />
                        <p className="text-xs font-bold uppercase tracking-widest">Select Scope to View Report</p>
                    </div>
                ) : isFetching ? (
                    <div className="flex h-full items-center justify-center bg-white rounded-xl">
                        <div className="animate-spin h-8 w-8 border-4 border-[#2f8d35]/20 border-t-[#2f8d35] rounded-full"></div>
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center bg-white rounded-xl text-red-400">
                        <p className="text-sm font-bold">Failed to load {mode} data.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            {mode === "travel" ? (
                                <table className="w-full border-collapse text-[10px] text-slate-600">
                                    <thead>
                                        <tr className="bg-[#2f8d35] text-white">
                                            <th className="border border-white/10 p-2 text-center w-6"><FilterIcon size={10} /></th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Branch</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Vehicle</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">
                                                Vehicle Brand
                                            </th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Vehicle Model</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Driver</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">IMEI No</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Start Location</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Start Odometer</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Distance</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Running V/S Stop</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words text-white">Running</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words text-[#f2a600]">Idle</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words text-[#ea4335]">Stop</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words text-blue">Inactive</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Duration</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Max Stoppage</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">No of Idle</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Speed (AVG/MAX)</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Over speed</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Alert(s)</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">End Odometer</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">End Location</th>
                                            <th className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Playback</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trips.map((row, idx) => {
                                            const isExpanded = expandedVehicleId === row.vehicleId;
                                            return (
                                                <React.Fragment key={row.vehicleId || idx}>
                                                    <tr className="hover:bg-slate-50 border-b border-slate-100">
                                                        <td className="p-2 text-center"><button onClick={() => setExpandedVehicleId(isExpanded ? null : row.vehicleId)} className={`transition-transform duration-200 ${isExpanded ? "rotate-90 text-slate-800" : "text-[#2f8d35]"}`}><Navigation size={10} fill="currentColor" /></button></td>
                                                        <td className="p-2 uppercase text-center">{row.branchName}</td>
                                                        <td className="p-2 font-bold text-center">{row.vehicleNumber}</td>
                                                        <td className="p-2 text-center">{row.brand}</td>
                                                        <td className="p-2 text-center">{row.model}</td>
                                                        <td className="p-2 text-center text-slate-400">{row.driverName}</td>
                                                        <td className="p-2 text-center">{row.imei}</td>
                                                        <td className="p-2 text-center max-w-[80px] break-words" title={formatLocation(row.startLocation)}>{formatLocation(row.startLocation)}</td>
                                                        <td className="p-2 text-center">{Number(row.startOdometer || 0).toFixed(2)}</td>
                                                        <td className="p-2 font-bold text-center">{Number(row.distance || 0).toFixed(2)}</td>
                                                        <td className="p-2 text-center min-w-[100px]">{renderProgressBar(row.runningTime, row.stopTime, row.idleTime)}</td>
                                                        <td className="p-2 text-[#2f8d35] font-bold text-center">{formatDuration(row.runningTime)}</td>
                                                        <td className="p-2 text-[#f2a600] font-bold text-center">{formatDuration(row.idleTime)}</td>
                                                        <td className="p-2 text-[#ea4335] font-bold text-center">{formatDuration(row.stopTime)}</td>
                                                        <td className="p-2 text-[#4285f4] font-bold text-center">{formatDuration(row.inactiveTime)}</td>
                                                        <td className="p-2 text-center">{formatDuration(row.duration)}</td>
                                                        <td className="p-2 text-[#ea4335] text-center">{formatDuration(row.maxStoppage)}</td>
                                                        <td className="p-2 text-center">{row.idleCount || 0}</td>
                                                        <td className="p-2 text-center"><span className="text-[#2f8d35]">{Math.round(row.avgSpeed)}</span> / <span className="text-[#ea4335]">{Math.round(row.maxSpeed)}</span></td>
                                                        <td className="p-2 text-center">{row.overSpeedCount || 0}</td>
                                                        <td className="p-2 text-[#ea4335] font-bold text-center">{row.alerts || 0}</td>
                                                        <td className="p-2 text-center">{Number(row.endOdometer || 0).toFixed(2)}</td>
                                                        <td className="p-2 text-center max-w-[80px] break-words" title={formatLocation(row.endLocation)}>{formatLocation(row.endLocation)}</td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                onClick={() => setPlaybackVehicleId(playbackVehicleId === row.vehicleId ? null : row.vehicleId)}
                                                                className="text-[#2f8d35] hover:scale-110 transition-transform"
                                                            >
                                                                <PlayCircle
                                                                    size={14}
                                                                    fill={playbackVehicleId === row.vehicleId ? "#2f8d35" : "none"}
                                                                    className={playbackVehicleId === row.vehicleId ? "text-[#2f8d35]" : "text-[#2f8d35]"}
                                                                />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && row.dailyBreakdown && (
                                                        <tr>
                                                            <td colSpan={24} className="bg-slate-800 p-0">
                                                                <table className="w-full text-[9px] text-white/70 border-collapse">
                                                                    <thead className="bg-[#1a3d1a] text-white/50 uppercase font-bold text-[8px]">
                                                                        <tr>
                                                                            <th className="p-2 border border-white/5">Date</th>
                                                                            <th className="p-2 border border-white/5">Day</th>
                                                                            <th className="p-2 border border-white/5 text-[#2f8d35]">First Ignition ON</th>
                                                                            <th className="p-2 border border-white/5">Start Location</th>
                                                                            <th className="p-2 border border-white/5">Distance</th>
                                                                            <th className="p-2 border border-white/5 text-[#2f8d35]">Running</th>
                                                                            <th className="p-2 border border-white/5 text-[#f2a600]">Idle</th>
                                                                            <th className="p-2 border border-white/5 text-[#ea4335]">Stop</th>
                                                                            <th className="p-2 border border-white/5 text-[#4285f4]">Inactive</th>
                                                                            <th className="p-2 border border-white/5">Running V/S Stop</th>
                                                                            <th className="p-2 border border-white/5">Duration</th>
                                                                            <th className="p-2 border border-white/5">Speed (AVG/MAX)</th>
                                                                            <th className="p-2 border border-white/5">Alert</th>
                                                                            <th className="p-2 border border-white/5">Odometer (Start/End)</th>
                                                                            <th className="p-2 border border-white/5 text-[#ea4335]">Last Ignition Off</th>
                                                                            <th className="p-2 border border-white/5">End Location</th>
                                                                            <th className="p-2 border border-white/5">History</th>
                                                                            <th className="p-2 border border-white/5">Playback</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {row.dailyBreakdown.map((day: any, dIdx: number) => (
                                                                            <tr key={dIdx} className="hover:bg-white/5 border-b border-white/5">
                                                                                <td className="p-2 text-center text-white">{day.date}</td>
                                                                                <td className="p-2 text-center">{day.day}</td>
                                                                                <td className="p-2 text-center text-[#2f8d35]">{formatDateTime(day.firstIgnitionOn?.time)}</td>
                                                                                <td className="p-2 text-center max-w-[100px] truncate break-words" title={formatLocation(day.startLocation)}>{formatLocation(day.startLocation)}</td>
                                                                                <td className="p-2 text-center font-bold text-white">{Number(day.distance || 0).toFixed(2)}</td>
                                                                                <td className="p-2 text-center text-[#2f8d35] font-bold">{formatDuration(day.runningTime)}</td>
                                                                                <td className="p-2 text-center text-[#f2a600] font-bold">{formatDuration(day.idleTime)}</td>
                                                                                <td className="p-2 text-center text-[#ea4335] font-bold">{formatDuration(day.stopTime)}</td>
                                                                                <td className="p-2 text-center text-[#4285f4] font-bold">{formatDuration(day.inactiveTime)}</td>
                                                                                <td className="p-2 text-center min-w-[80px]">{renderProgressBar(day.runningTime, day.stopTime, day.idleTime, "h-1")}</td>
                                                                                <td className="p-2 text-center">{formatDuration(day.duration)}</td>
                                                                                <td className="p-2 text-center"><span className="text-[#2f8d35]">{Math.round(day.avgSpeed)}</span> / <span className="text-[#ea4335]">{Math.round(day.maxSpeed)}</span></td>
                                                                                <td className="p-2 text-center text-[#ea4335]">{day.alerts || 0}</td>
                                                                                <td className="p-2 text-center">{Number(day.startOdometer || 0).toFixed(1)} / {Number(day.endOdometer || 0).toFixed(1)}</td>
                                                                                <td className="p-2 text-center text-[#ea4335]">{formatDateTime(day.lastIgnitionOff?.time)}</td>
                                                                                <td className="p-2 text-center max-w-[100px] break-words" title={formatLocation(day.endLocation)}>{formatLocation(day.endLocation)}</td>
                                                                                <td className="p-2 text-center"><button className="text-[#2f8d35] hover:scale-110"><History size={12} /></button></td>
                                                                                <td className="p-2 text-center"><button onClick={() => setPlaybackVehicleId(playbackVehicleId === row.vehicleId ? null : row.vehicleId)} className="text-[#2f8d35] hover:scale-110"><PlayCircle size={12} fill="currentColor" className="text-[#2f8d35] fill-[#2f8d35]/20" /></button></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {playbackVehicleId === row.vehicleId && (
                                                        <tr>
                                                            <td colSpan={24} className="p-0 bg-white border-none">
                                                                <TravelPlaybackInline
                                                                    vehicleId={row.vehicleId}
                                                                    vehicleNumber={row.vehicleNumber}
                                                                    from={filters.from}
                                                                    to={filters.to}
                                                                    metadata={{
                                                                        brand: row.brand,
                                                                        model: row.model,
                                                                        driverName: row.driverName,
                                                                        imei: row.imei,
                                                                        organization: row.branchName,
                                                                        totalDistance: Number(row.distance || 0),
                                                                        avgSpeed: Number(row.avgSpeed || 0),
                                                                        vehicleType: row.model
                                                                    }}
                                                                    onClose={() => setPlaybackVehicleId(null)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <table className="w-full border-collapse text-[10px] text-slate-600">
                                    <thead>
                                        <tr className="bg-[#2f8d35] text-white">
                                            <th rowSpan={2} className="border border-white/10 p-2 text-center w-6"><FilterIcon size={10} /></th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Branch</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Vehicle</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Vehicle Brand</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Vehicle Model</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Driver</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">IMEI No</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Distance</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center text-white">Running</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center text-[#f2a600]">Idle</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center text-[#ea4335]">Stop</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center text-[#4285f4]">Inactive</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-normal text-center max-w-[100px] break-words">Running V/S Stop</th>
                                            <th colSpan={2} className="border border-white/10 p-1 font-bold whitespace-normal text-center max-w-[100px] break-words">First Ignition On</th>
                                            <th colSpan={2} className="border border-white/10 p-1 font-bold whitespace-normal text-center max-w-[100px] break-words">Last Ignition Off</th>
                                            <th colSpan={2} className="border border-white/10 p-1 font-bold whitespace-nowrap text-center bg-white/10">Speed</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">IMMobilize</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Over speed</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Alert(s)</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">No of trip</th>
                                            <th rowSpan={2} className="border border-white/10 p-2 font-bold whitespace-nowrap text-center">Playback</th>
                                        </tr>
                                        <tr className="bg-[#2f8d35] text-white/80 text-[8px]">
                                            <th className="border border-white/10 p-1 font-bold text-center">On Time</th>
                                            <th className="border border-white/10 p-1 font-bold text-center">On location</th>
                                            <th className="border border-white/10 p-1 font-bold text-center">Off Time</th>
                                            <th className="border border-white/10 p-1 font-bold text-center">Off location</th>
                                            <th className="border border-white/10 p-1 font-bold text-center">AVG</th>
                                            <th className="border border-white/10 p-1 font-bold text-center">MAX</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trips.map((row, idx) => {
                                            const isExpanded = expandedVehicleId === row.vehicleId;
                                            return (
                                                <React.Fragment key={row.vehicleId || idx}>
                                                    <tr className="hover:bg-slate-50 border-b border-slate-100">
                                                        <td className="p-2 text-center"><button onClick={() => setExpandedVehicleId(isExpanded ? null : row.vehicleId)} className={`transition-transform duration-200 ${isExpanded ? "rotate-90 text-slate-800" : "text-[#2f8d35]"}`}><Navigation size={10} fill="currentColor" /></button></td>
                                                        <td className="p-2 uppercase text-center">{row.branchName}</td>
                                                        <td className="p-2 font-bold text-center">{row.vehicleNumber}</td>
                                                        <td className="p-2 text-center">{row.brand}</td>
                                                        <td className="p-2 text-center">{row.model}</td>
                                                        <td className="p-2 text-center text-slate-400">{row.driverName}</td>
                                                        <td className="p-2 text-center">{row.imei}</td>
                                                        <td className="p-2 font-bold text-center">{Number(row.distance || 0).toFixed(2)}</td>
                                                        <td className="p-2 text-[#2f8d35] font-bold text-center">{formatDuration(row.runningTime)}</td>
                                                        <td className="p-2 text-[#f2a600] font-bold text-center">{formatDuration(row.idleTime)}</td>
                                                        <td className="p-2 text-[#ea4335] font-bold text-center">{formatDuration(row.stopTime)}</td>
                                                        <td className="p-2 text-[#4285f4] font-bold text-center">{formatDuration(row.inactiveTime)}</td>
                                                        <td className="p-2 text-center min-w-[80px]">{renderProgressBar(row.runningTime, row.stopTime, row.idleTime)}</td>
                                                        <td className="p-1 text-center font-bold text-[#2f8d35]">{formatDateTime(row.firstIgnitionOn?.time)}</td>
                                                        <td className="p-1 text-center text-[9px] max-w-[80px] break-words" title={formatLocation(row.firstIgnitionOn?.location)}>
                                                            {formatLocation(row.firstIgnitionOn?.location)}
                                                        </td>
                                                        <td className="p-1 text-center font-bold text-[#ea4335]">{formatDateTime(row.lastIgnitionOff?.time)}</td>
                                                        <td className="p-1 text-center text-[9px] max-w-[80px] break-words" title={formatLocation(row.lastIgnitionOff?.location)}>
                                                            {formatLocation(row.lastIgnitionOff?.location)}
                                                        </td>
                                                        <td className="p-2 text-center font-bold">{Math.round(row.avgSpeed)}</td>
                                                        <td className="p-2 text-[#ea4335] font-bold text-center">{Math.round(row.maxSpeed)}</td>
                                                        <td className="p-2 text-center font-bold">{row.immobilize}</td>
                                                        <td className="p-2 text-center">{row.overSpeedCount || 0}</td>
                                                        <td className="p-2 text-[#ea4335] font-bold text-center">{row.alerts || 0}</td>
                                                        <td className="p-2 font-bold text-center text-[#2f8d35]">{row.tripCount || 0}</td>
                                                        <td className="p-2 text-center">
                                                            <button
                                                                onClick={() => setPlaybackVehicleId(playbackVehicleId === row.vehicleId ? null : row.vehicleId)}
                                                                className="text-[#2f8d35] hover:scale-110 transition-transform"
                                                            >
                                                                <PlayCircle
                                                                    size={14}
                                                                    fill={playbackVehicleId === row.vehicleId ? "#2f8d35" : "none"}
                                                                    className={playbackVehicleId === row.vehicleId ? "text-[#2f8d35]" : "text-[#2f8d35]"}
                                                                />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && row.individualTrips && (
                                                        <tr>
                                                            <td colSpan={24} className="bg-[#121212] p-0">
                                                                <table className="w-full text-[9px] text-white/60 border-collapse">
                                                                    <thead className="bg-[#1f1f1f] text-white/40 uppercase font-black text-[8px]">
                                                                        <tr className="border-b border-white/5">
                                                                            <th colSpan={4} className="p-2 border-r border-white/5 text-[#2f8d35]">Start Phase</th>
                                                                            <th colSpan={4} className="p-2 border-r border-white/5 text-[#ea4335]">End Phase</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Driver</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Distance</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Total Distance</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Running V/S Stop</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5 text-[#2f8d35]">Running</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5 text-[#f2a600]">Idle</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5 text-[#ea4335]">Stop</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5 text-[#4285f4]">Inactive</th>
                                                                            <th colSpan={2} className="p-2 border-r border-white/5">Speed</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Over Speed</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Immobilize</th>
                                                                            <th rowSpan={2} className="p-2 border-r border-white/5">Alert(s)</th>
                                                                            <th rowSpan={2} className="p-2">Show Path</th>
                                                                        </tr>
                                                                        <tr className="bg-[#1a1a1a] text-[7px]">
                                                                            <th className="p-1 border-r border-white/5">Time</th>
                                                                            <th className="p-1 border-r border-white/5">Location</th>
                                                                            <th className="p-1 border-r border-white/5">Odometer</th>
                                                                            <th className="p-1 border-r border-white/5">Coordinate</th>
                                                                            <th className="p-1 border-r border-white/5 text-[#ea4335]">Time</th>
                                                                            <th className="p-1 border-r border-white/5">Location</th>
                                                                            <th className="p-1 border-r border-white/5">Odometer</th>
                                                                            <th className="p-1 border-r border-white/5">Coordinate</th>
                                                                            <th className="p-1 border-r border-white/5">AVG</th>
                                                                            <th className="p-1 border-r border-white/5">MAX</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {row.individualTrips.map((it: any, itIdx: number) => (
                                                                            <tr key={itIdx} className="hover:bg-white/5 border-b border-white/5">
                                                                                <td className="p-2 text-center font-bold text-white/90">{formatDateTime(it.startTime)}</td>
                                                                                <td className="p-2 text-center max-w-[80px] truncate" title={formatLocation(it.startLocation)}>{formatLocation(it.startLocation)}</td>
                                                                                <td className="p-2 text-center font-mono opacity-50">{Number(it.startOdometer || 0).toFixed(1)}</td>
                                                                                <td className="p-2 text-center text-[7px] text-white/30">{it.startCoordinate}</td>
                                                                                <td className="p-2 text-center font-bold text-white/90">{formatDateTime(it.endTime)}</td>
                                                                                <td className="p-2 text-center max-w-[80px] truncate" title={formatLocation(it.endLocation)}>{formatLocation(it.endLocation)}</td>
                                                                                <td className="p-2 text-center font-mono opacity-50">{Number(it.endOdometer || 0).toFixed(1)}</td>
                                                                                <td className="p-2 text-center text-[7px] text-white/30">{it.endCoordinate}</td>
                                                                                <td className="p-2 text-center text-white/40">{it.driverName}</td>
                                                                                <td className="p-2 text-center font-bold text-[#2f8d35]">{Number(it.distance || 0).toFixed(2)}</td>
                                                                                <td className="p-2 text-center opacity-30">{Number(it.distance || 0).toFixed(2)}</td>
                                                                                <td className="p-2 text-center min-w-[60px]">{renderProgressBar(it.runningTime, it.stopTime, it.idleTime, "h-1")}</td>
                                                                                <td className="p-2 text-center text-[#2f8d35] font-bold">{formatDuration(it.runningTime)}</td>
                                                                                <td className="p-2 text-center text-[#f2a600]">{formatDuration(it.idleTime)}</td>
                                                                                <td className="p-2 text-center text-[#ea4335] font-bold">{formatDuration(it.stopTime)}</td>
                                                                                <td className="p-2 text-center text-[#4285f4]">{formatDuration(it.inactiveTime)}</td>
                                                                                <td className="p-2 text-center font-bold text-white">{Math.round(it.avgSpeed)}</td>
                                                                                <td className="p-2 text-center font-bold text-[#ea4335]">{Math.round(it.maxSpeed)}</td>
                                                                                <td className="p-2 text-center">{it.overSpeed}</td>
                                                                                <td className="p-2 text-center">{it.immobilize}</td>
                                                                                <td className="p-2 text-center text-[#ea4335] font-bold">{it.alerts || 0}</td>
                                                                                <td className="p-2 text-center"><button className="text-[#2f8d35] hover:scale-125 transition-transform"><MapPin size={12} /></button></td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    )}
                                                    {playbackVehicleId === row.vehicleId && (
                                                        <tr>
                                                            <td colSpan={24} className="p-0 bg-white border-none">
                                                                <TravelPlaybackInline
                                                                    vehicleId={row.vehicleId}
                                                                    vehicleNumber={row.vehicleNumber}
                                                                    from={filters.from}
                                                                    to={filters.to}
                                                                    metadata={{
                                                                        brand: row.brand,
                                                                        model: row.model,
                                                                        driverName: row.driverName,
                                                                        imei: row.imei,
                                                                        organization: row.branchName,
                                                                        totalDistance: Number(row.distance || 0),
                                                                        avgSpeed: Number(row.avgSpeed || 0),
                                                                        vehicleType: row.model
                                                                    }}
                                                                    onClose={() => setPlaybackVehicleId(null)}
                                                                />
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
