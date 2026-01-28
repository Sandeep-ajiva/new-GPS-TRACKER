"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Link2, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
    useGetDeviceMappingsQuery,
    useAssignDeviceMutation,
    useUnassignDeviceMutation
} from "@/redux/api/deviceMappingApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";

export default function DeviceMappingPage() {
    // API Hooks
    const { data: mappingData, isLoading: isMappingLoading } = useGetDeviceMappingsQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: devData, isLoading: isDevLoading } = useGetGpsDevicesQuery(undefined, { refetchOnMountOrArgChange: true });

    // Mutations
    const [assignDevice, { isLoading: isAssigning }] = useAssignDeviceMutation();
    const [unassignDevice, { isLoading: isUnassigning }] = useUnassignDeviceMutation();

    const mappings = mappingData?.data || [];
    const vehicles = vehData?.data || [];
    const devices = devData?.data || [];

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ vehicleId: "", deviceId: "" });

    // Filter available vehicles and devices
    // Logic: Available if NOT in mappings list OR currently unassigned status (redundant check but safe)
    // Actually, backend should handle availability but valid list filtering helps UI.
    const assignedVehicleIds = new Set(mappings.map((m: any) => m.vehicleId?._id || m.vehicleId));
    const assignedDeviceIds = new Set(mappings.map((m: any) => m.deviceId?._id || m.deviceId));

    const availableVehicles = vehicles.filter((v: any) => !assignedVehicleIds.has(v._id));
    const availableDevices = devices.filter((d: any) => !assignedDeviceIds.has(d._id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleId || !formData.deviceId) {
            toast.error("Select both vehicle and device");
            return;
        }

        try {
            await assignDevice({
                vehicleId: formData.vehicleId,
                deviceId: formData.deviceId
            }).unwrap();
            toast.success("Device assigned successfully");
            closeModal();
        } catch (err: any) {
            toast.error(err?.data?.message || "Assignment failed");
        }
    };

    const handleUnassign = async (id: string) => {
        if (confirm("Are you sure you want to unassign this device?")) {
            try {
                // unassignDevice endpoint usually expects mappingId or vehicle/deviceId combo.
                // deviceMappingApi.ts has unassignDevice accepting ID.
                await unassignDevice(id).unwrap();
                toast.success("Device unassigned");
            } catch (err: any) {
                toast.error(err?.data?.message || "Unassignment failed");
            }
        }
    }

    const openCreateModal = () => {
        setFormData({ vehicleId: "", deviceId: "" });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const columns = [
        {
            header: "Vehicle",
            accessor: (row: any) => {
                // Handle populated or ID
                const vehicle = row.vehicleId;
                if (vehicle && typeof vehicle === 'object') return vehicle.vehicleNumber || "Unknown";
                // Fallback lookup
                const v = vehicles.find((item: any) => item._id === vehicle);
                return v?.vehicleNumber || "Unknown";
            }
        },
        {
            header: "Organization",
            accessor: (row: any) => {
                const vehicle = row.vehicleId;
                const vObj = (typeof vehicle === 'object') ? vehicle : vehicles.find((item: any) => item._id === vehicle);
                const org = vObj?.organizationId;
                if (org && typeof org === 'object') return org.name;
                // Can't lookup org name easily without org list access or population
                return "N/A";
            }
        },
        {
            header: "Device IMEI",
            accessor: (row: any) => {
                const device = row.deviceId;
                if (device && typeof device === 'object') return device.imei || "Unknown";
                const d = devices.find((item: any) => item._id === device);
                return d?.imei || "Unknown";
            }
        },
        { header: "Assigned Date", accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
        {
            header: "Actions", accessor: (row: any) => (
                <button
                    onClick={() => handleUnassign(row._id)}
                    disabled={isUnassigning}
                    className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                    <Trash2 size={14} /> Unassign
                </button>
            )
        }
    ];

    const isLoading = isMappingLoading || isVehLoading || isDevLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-slate-500" size={32} />
            </div>
        )
    }

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Operations</p>
                        <h1 className="text-2xl font-black text-slate-900">Device Mapping</h1>
                        <p className="text-sm text-slate-500">Associate GPS devices with vehicles.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                    >
                        <span className="inline-flex items-center gap-2"><Link2 size={16} /> Assign Device</span>
                    </button>
                </div>

                <Table columns={columns} data={mappings} loading={isLoading} />

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <h2 className="text-xl font-black text-slate-900">Assign Device to Vehicle</h2>
                            <p className="text-xs text-slate-500">Link available assets and keep tracking synced.</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Select Vehicle</label>
                                    <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.vehicleId} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}>
                                        <option value="">Select available vehicle...</option>
                                        {availableVehicles.map((v: any) => (
                                            <option key={v._id} value={v._id}>{v.vehicleNumber} {v.model ? `(${v.model})` : ""}</option>
                                        ))}
                                    </select>
                                    {availableVehicles.length === 0 && <p className="mt-1 text-xs font-semibold text-rose-600">No available vehicles found</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Select Device</label>
                                    <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.deviceId} onChange={e => setFormData({ ...formData, deviceId: e.target.value })}>
                                        <option value="">Select available device...</option>
                                        {availableDevices.map((d: any) => (
                                            <option key={d._id} value={d._id}>{d.imei}</option>
                                        ))}
                                    </select>
                                    {availableDevices.length === 0 && <p className="mt-1 text-xs font-semibold text-rose-600">No available devices found</p>}
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200">Cancel</button>
                                    <button type="submit" disabled={!formData.vehicleId || !formData.deviceId || isAssigning} className="flex-1 rounded-xl bg-blue-600 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isAssigning ? "Assigning..." : "Assign"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ApiErrorBoundary>
    );
}
