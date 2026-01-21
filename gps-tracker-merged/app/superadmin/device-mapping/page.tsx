"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Link2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

const demoVehicles = [
    { _id: "veh_1", vehicleNumber: "DL 10CK1840", model: "Camry" },
    { _id: "veh_2", vehicleNumber: "PB 10AX2234", model: "Tata 407" },
];

const demoDevices = [
    { _id: "gps_1", imei: "86543210001" },
    { _id: "gps_2", imei: "86543210002" },
];

const demoMappings = [
    { _id: "map_1", vehicleId: demoVehicles[0], deviceId: demoDevices[0], createdAt: new Date().toISOString() },
];

export default function DeviceMappingPage() {
    const [mappings, setMappings] = useState(demoMappings);
    const [vehicles] = useState(demoVehicles);
    const [devices] = useState(demoDevices);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ vehicleId: "", deviceId: "" });

    // Filter available vehicles and devices
    const assignedVehicleIds = new Set(mappings?.map((m: any) => m.vehicleId?._id));
    const assignedDeviceIds = new Set(mappings?.map((m: any) => m.deviceId?._id));

    const availableVehicles = vehicles?.filter((v: any) => !assignedVehicleIds.has(v._id));
    const availableDevices = devices?.filter((d: any) => !assignedDeviceIds.has(d._id));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const vehicle = vehicles.find((v: any) => v._id === formData.vehicleId);
        const device = devices.find((d: any) => d._id === formData.deviceId);
        if (!vehicle || !device) {
            toast.error("Select both vehicle and device");
            return;
        }
        setMappings((prev) => [
            ...prev,
            {
                _id: `map_${Date.now()}`,
                vehicleId: vehicle,
                deviceId: device,
                createdAt: new Date().toISOString(),
            },
        ]);
        toast.success("Device assigned successfully");
        closeModal();
    };

    const handleUnassign = async (id: string) => {
        if (confirm("Are you sure you want to unassign this device?")) {
            setMappings((prev) => prev.filter((mapping: any) => mapping._id !== id));
            toast.success("Device unassigned");
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
                <button onClick={() => handleUnassign(row._id)} className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-300 hover:text-rose-200">
                    <Trash2 size={14} /> Unassign
                </button>
            )
        }
    ];

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Operations</p>
                        <h1 className="text-2xl font-black text-slate-100">Device Mapping</h1>
                        <p className="text-sm text-slate-400">Associate GPS devices with vehicles.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                        <span className="inline-flex items-center gap-2"><Link2 size={16} /> Assign Device</span>
                    </button>
                </div>

            <Table columns={columns} data={mappings} loading={false} variant="dark" />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
                        <h2 className="text-xl font-black text-slate-100">Assign Device to Vehicle</h2>
                        <p className="text-xs text-slate-400">Link devices to vehicles in the fleet.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Select Vehicle</label>
                                <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.vehicleId} onChange={e => setFormData({ ...formData, vehicleId: e.target.value })}>
                                    <option value="">Select available vehicle...</option>
                                    {availableVehicles?.map((v: any) => (
                                        <option key={v._id} value={v._id}>{v.vehicleNumber} ({v.model})</option>
                                    ))}
                                </select>
                                {availableVehicles?.length === 0 && <p className="mt-1 text-xs font-semibold text-rose-300">No available vehicles found</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Select Device</label>
                                <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.deviceId} onChange={e => setFormData({ ...formData, deviceId: e.target.value })}>
                                    <option value="">Select available device...</option>
                                    {availableDevices?.map((d: any) => (
                                        <option key={d._id} value={d._id}>{d.imei}</option>
                                    ))}
                                </select>
                                {availableDevices?.length === 0 && <p className="mt-1 text-xs font-semibold text-rose-300">No available devices found</p>}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-200 hover:bg-slate-900">Cancel</button>
                                <button type="submit" disabled={!formData.vehicleId || !formData.deviceId} className="flex-1 rounded-xl bg-emerald-500/30 py-2.5 text-[11px] font-black uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </ApiErrorBoundary>
    );
}
