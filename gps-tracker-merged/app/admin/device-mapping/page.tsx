"use client";

import { useState } from "react";
import {
    useGetDeviceMappingsQuery,
    useAssignDeviceMutation,
    useUnassignDeviceMutation
} from "@/redux/api/deviceMappingApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Link2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export default function DeviceMappingPage() {
    const { data: mappings, isLoading, error } = useGetDeviceMappingsQuery({});
    const { data: vehicles } = useGetVehiclesQuery({});
    const { data: devices } = useGetGpsDevicesQuery({});

    const [assignDevice] = useAssignDeviceMutation();
    const [unassignDevice] = useUnassignDeviceMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ vehicleId: "", deviceId: "" });

    // Filter available vehicles and devices
    const assignedVehicleIds = new Set(mappings?.map((m: any) => m.vehicleId?._id));
    const assignedDeviceIds = new Set(mappings?.map((m: any) => m.deviceId?._id));

    const availableVehicles = vehicles?.filter((v: any) => !assignedVehicleIds.has(v._id));
    const availableDevices = devices?.filter((d: any) => !assignedDeviceIds.has(d._id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await assignDevice(formData).unwrap();
            toast.success("Device assigned successfully");
            closeModal();
        } catch (error: any) {
            toast.error(error?.data?.message || "Failed to assign device");
        }
    };

    const handleUnassign = async (id: string) => {
        if (confirm("Are you sure you want to unassign this device?")) {
            try {
                await unassignDevice(id).unwrap();
                toast.success("Device unassigned");
            } catch (error: any) {
                toast.error(error?.data?.message || "Failed to unassign");
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
        { header: "Vehicle", accessor: (row: any) => row.vehicleId?.vehicleNumber || "Unknown" },
        { header: "Organization", accessor: (row: any) => row.vehicleId?.organizationId?.name || "N/A" },
        { header: "Device IMEI", accessor: (row: any) => row.deviceId?.imei || "Unknown" },
        { header: "Assigned Date", accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
        {
            header: "Actions", accessor: (row: any) => (
                <button onClick={() => handleUnassign(row._id)} className="text-red-500 hover:text-red-700 font-medium text-xs flex items-center gap-1">
                    <Trash2 size={14} /> Unassign
                </button>
            )
        }
    ];

    return (
        <ApiErrorBoundary hasError={!!error}>
            <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Device Mapping</h1>
                    <p className="text-sm text-gray-500">Associate GPS devices with vehicles.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Link2 size={16} /> Assign Device
                </button>
            </div>

            <Table columns={columns} data={mappings} loading={isLoading} />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">Assign Device to Vehicle</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Vehicle</label>
                                <select required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.vehicleId} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}>
                                    <option value="">Select available vehicle...</option>
                                    {availableVehicles?.map((v: any) => (
                                        <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.model})</option>
                                    ))}
                                </select>
                                {availableVehicles?.length === 0 && <p className="text-xs text-red-500 mt-1">No available vehicles found</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Select Device</label>
                                <select required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.deviceId} onChange={e => setFormData({ ...formData, deviceId: e.target.value })}>
                                    <option value="">Select available device...</option>
                                    {availableDevices?.map((d: any) => (
                                        <option key={d._id} value={d._id}>{d.imei}</option>
                                    ))}
                                </select>
                                {availableDevices?.length === 0 && <p className="text-xs text-red-500 mt-1">No available devices found</p>}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">Cancel</button>
                                <button type="submit" disabled={!formData.vehicleId || !formData.deviceId} className="flex-1 py-2.5 bg-[#1877F2] text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </ApiErrorBoundary>
    );
}
