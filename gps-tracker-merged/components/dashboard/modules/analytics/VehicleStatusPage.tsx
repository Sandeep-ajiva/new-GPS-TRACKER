"use client"

import { useState } from "react"
import { BatteryCharging, Fuel, Power, Satellite, Thermometer, TimerReset, Zap, Car, Filter } from "lucide-react"
import { useGetVehicleStatusQuery } from "@/redux/api/gpsHistoryApi"
import { ReportFilterBar, ReportFilterState, getDefaultReportFilter } from "./ReportFilterBar"

export function VehicleStatusPage({
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

    const { data, isFetching, error } = useGetVehicleStatusQuery(
        { vehicleId: filters.vehicleId },
        { skip: !isValidVehicle }
    )

    const status = data?.data
    const selectedVehicleObj = vehicles.find((v) => v._id === filters.vehicleId || v.id === filters.vehicleId)

    const cards = [
        { label: "Ignition", value: status?.ignitionStatus ? "On" : "Off", icon: Zap, tone: status?.ignitionStatus ? "text-[#38a63c]" : "text-[#ea4335]" },
        { label: "Speed", value: `${Number(status?.currentSpeed || 0).toFixed(1)} km/h`, icon: TimerReset, tone: "text-[#38a63c]" },
        { label: "Battery", value: status?.batteryLevel != null ? `${status.batteryLevel}%` : "N/A", icon: BatteryCharging, tone: "text-[#4285f4]" },
        { label: "Satellites", value: status?.satellites ?? "N/A", icon: Satellite, tone: "text-[#f3a338]" },
        { label: "Fuel", value: status?.fuel != null ? `${status.fuel}%` : "N/A", icon: Fuel, tone: "text-[#ea4335]" },
        { label: "Temperature", value: status?.temperature || "N/A", icon: Thermometer, tone: "text-[#f2a600]" },
        { label: "Main Power", value: status?.powerStatus === true ? "On" : "Off", icon: Power, tone: status?.powerStatus ? "text-[#38a63c]" : "text-[#ea4335]" },
    ]

    return (
        <div className="flex h-full flex-col bg-white">
            <div className="border-b border-[#d8e6d2] px-6 py-2">
                <h2 className="text-sm font-bold text-slate-600">Current Vehicle Status</h2>
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
                        <Car className="mb-4 h-12 w-12 opacity-20" />
                        <p className="font-semibold text-base text-[#2f8d35]">Select a specific vehicle to view current status</p>
                    </div>
                ) : isFetching ? (
                    <div className="flex h-full items-center justify-center font-semibold text-slate-500">
                        Loading vehicle status...
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center font-semibold text-red-500">
                        Error fetching vehicle status.
                    </div>
                ) : (
                    <div className="flex flex-col h-full bg-[#fcfdfc]">
                        {/* Status Cards Row */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 p-4">
                            {cards.map((card) => (
                                <div key={card.label} className="flex flex-col items-center justify-center rounded-xl border border-[#d8e6d2] bg-white p-3 shadow-sm text-center">
                                    <card.icon className={`h-5 w-5 mb-2 ${card.tone}`} />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{card.label}</p>
                                    <p className="mt-1 text-sm font-black text-[#1f3b1f] whitespace-nowrap">{card.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* Detailed Table (Figma Style) */}
                        <table className="min-w-full border-collapse text-left">
                            <thead className="sticky top-0 z-10 bg-[#2f8d35] text-white">
                                <tr>
                                    <th className="border border-white/20 p-2 w-10"><Filter size={12} /></th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight">Parameter</th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Value</th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight text-center">Unit</th>
                                    <th className="border border-white/20 p-2 font-bold uppercase tracking-tight">Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700">
                                <tr className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                    <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">1</td>
                                    <td className="border border-[#ececec] p-2 font-bold">Location</td>
                                    <td className="border border-[#ececec] p-2 text-center text-slate-900 bg-[#fcfdfc]" colSpan={2}>{status?.currentLocation?.address || "Detecting..."}</td>
                                    <td className="border border-[#ececec] p-2 font-bold text-[#4285f4]">Active</td>
                                </tr>
                                <tr className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                    <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">2</td>
                                    <td className="border border-[#ececec] p-2 font-bold">GPS Satellites</td>
                                    <td className="border border-[#ececec] p-2 text-center text-slate-900 bg-[#fcfdfc] font-black">{status?.satellites || 0}</td>
                                    <td className="border border-[#ececec] p-2 text-center text-slate-500">Count</td>
                                    <td className="border border-[#ececec] p-2 font-bold text-[#38a63c]">Fixed</td>
                                </tr>
                                <tr className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                    <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">3</td>
                                    <td className="border border-[#ececec] p-2 font-bold">Internal Battery</td>
                                    <td className="border border-[#ececec] p-2 text-center text-slate-900 bg-[#fcfdfc] font-black">{status?.batteryVoltage?.toFixed(2) || "0.00"}</td>
                                    <td className="border border-[#ececec] p-2 text-center text-slate-500">Volts</td>
                                    <td className="border border-[#ececec] p-2 font-bold text-[#38a63c]">{status?.batteryLevel || 0}%</td>
                                </tr>
                                <tr className="border-b border-[#ececec] hover:bg-[#f9fdf8]">
                                    <td className="border border-[#ececec] p-2 text-center text-[#2f8d35] font-bold">4</td>
                                    <td className="border border-[#ececec] p-2 font-bold">Last Communication</td>
                                    <td className="border border-[#ececec] p-2 text-center text-slate-900 bg-[#fcfdfc]" colSpan={2}>{status?.gpsTimestamp ? new Date(status.gpsTimestamp).toLocaleString() : "N/A"}</td>
                                    <td className="border border-[#ececec] p-2 font-bold text-slate-500">Online</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="mt-auto p-4 flex items-center justify-between border-t border-[#d8e6d2] bg-[#f7fbf5]">
                            <p className="font-bold text-[#2f8d35]">
                                {selectedVehicleObj?.vehicleNumber} • {selectedVehicleObj?.imei || "IMEI N/A"}
                            </p>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-[#38a63c] animate-pulse"></span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Live Connection Stable</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
