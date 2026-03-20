"use client";

import { useMemo } from "react";
import { Activity, AlertTriangle, Battery, Cpu, RefreshCw, Wifi } from "lucide-react";
import { useGetAllLatestHealthQuery } from "@/redux/api/healthMonitoringApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

interface HealthMonitoringPageProps {
  organizations?: any[];
  vehicles?: any[];
  userRole?: string | null;
  userOrgId?: string | null;
}

const BatteryBar = ({ value, threshold = 20 }: { value?: number; threshold?: number }) => {
  if (value === undefined || value === null)
    return <span className="text-slate-400 text-xs">N/A</span>;
  const color =
    value <= threshold ? "bg-red-500" : value <= 40 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold ${value <= threshold ? "text-red-600" : "text-slate-700"}`}>
        {value}%
      </span>
      {value <= threshold && <AlertTriangle size={12} className="text-red-500" />}
    </div>
  );
};

const MemoryBar = ({ value }: { value?: number }) => {
  if (value === undefined || value === null)
    return <span className="text-slate-400 text-xs">N/A</span>;
  const color =
    value >= 90 ? "bg-red-500" : value >= 70 ? "bg-amber-500" : "bg-blue-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className={`text-xs font-bold ${value >= 90 ? "text-red-600" : "text-slate-700"}`}>
        {value}%
      </span>
    </div>
  );
};

export function HealthMonitoringPage({ userOrgId }: HealthMonitoringPageProps) {
  const { data: healthData, isLoading, refetch } = useGetAllLatestHealthQuery(undefined, {
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
  });
  const { data: vehData } = useGetVehiclesQuery({ page: 0, limit: 1000 });

  const vehicles = useMemo(() => vehData?.vehicles || vehData?.data || [], [vehData]);
  const records = useMemo(() => healthData?.data || [], [healthData]);

  const getVehicleNumber = (record: any) => {
    const vehicleId =
      typeof record.vehicleId === "object" ? record.vehicleId?._id : record.vehicleId;
    const vehicle = vehicles.find((v: any) => v._id === vehicleId);
    return vehicle?.vehicleNumber || record.imei || "Unknown";
  };

  const summary = useMemo(() => {
    const lowBat = records.filter(
      (r) => r.batteryPercentage !== undefined && r.batteryPercentage <= (r.lowBatteryThreshold ?? 20)
    ).length;
    const highMem = records.filter(
      (r) => r.memoryPercentage !== undefined && r.memoryPercentage >= 80
    ).length;
    const batRecords = records.filter((r) => r.batteryPercentage !== undefined);
    const avgBat =
      batRecords.length
        ? Math.round(batRecords.reduce((a, r) => a + (r.batteryPercentage ?? 0), 0) / batRecords.length)
        : 0;
    return { lowBat, highMem, avgBat, total: records.length };
  }, [records]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            Device Intelligence
          </p>
          <h2 className="text-xl font-black text-slate-900 mt-0.5">Health Monitoring</h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time battery, memory and firmware status across all GPS devices.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.22em] text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Devices",  value: summary.total,       icon: Wifi,     color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Low Battery",    value: summary.lowBat,      icon: Battery,  color: "text-red-600",    bg: "bg-red-50"    },
          { label: "High Memory",    value: summary.highMem,     icon: Cpu,      color: "text-amber-600",  bg: "bg-amber-50"  },
          { label: "Avg Battery",    value: `${summary.avgBat}%`,icon: Activity, color: "text-green-600",  bg: "bg-green-50"  },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.label}</p>
            <p className={`text-2xl font-black mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Device Health Status</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Latest health packet received from each GPS device.</p>
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
            Loading health data...
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Wifi size={32} className="mb-3 opacity-30" />
            <p className="text-sm font-bold">No health data received yet</p>
            <p className="text-xs mt-1">Health packets ($HLM) will appear here once devices transmit them.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {["Vehicle / IMEI", "Battery", "Memory", "Firmware", "Update Rate (On/Off)", "Digital I/O", "Last Seen"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {records.map((record, i) => (
                  <tr key={record._id || i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-xs font-black text-slate-900">{getVehicleNumber(record)}</p>
                      <p className="text-[10px] text-slate-400">{record.imei}</p>
                    </td>
                    <td className="px-4 py-3">
                      <BatteryBar value={record.batteryPercentage} threshold={record.lowBatteryThreshold} />
                    </td>
                    <td className="px-4 py-3">
                      <MemoryBar value={record.memoryPercentage} />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-slate-600">{record.softwareVersion || "N/A"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600">
                        {record.dataUpdateRateIgnitionOn ?? "—"}s / {record.dataUpdateRateIgnitionOff ?? "—"}s
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600">{record.digitalInputStatus || "0000"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-500">
                        {record.timestamp ? new Date(record.timestamp).toLocaleString("en-GB") : "N/A"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}