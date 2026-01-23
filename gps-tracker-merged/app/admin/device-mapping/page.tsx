"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Link2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { getMappings, getVehicles, getDevices, setMappings, setVehicles, setDevices, type DeviceMapping } from "@/lib/admin-dummy-data";

export default function DeviceMappingPage() {
    const [mappings, setMappingsState] = useState(getMappings());
    const [vehicles] = useState(getVehicles());
    const [devices] = useState(getDevices());

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ vehicleId: "", deviceId: "" });

    // Filter available vehicles and devices
    const assignedVehicleIds = new Set(mappings?.map((m: any) => m.vehicleId?._id || m.vehicleId));
    const assignedDeviceIds = new Set(mappings?.map((m: any) => m.deviceId?._id || m.deviceId));

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
        const newMapping: DeviceMapping = {
            _id: `map_${Date.now()}`,
            vehicleId: formData.vehicleId,
            deviceId: formData.deviceId,
            createdAt: new Date().toISOString(),
        };
        const updatedMappings = [...mappings, newMapping];
        setMappingsState(updatedMappings);
        setMappings(updatedMappings);
        
        // Update vehicle and device to reflect assignment
        const updatedVehicles = vehicles.map(v => 
            v._id === formData.vehicleId ? { ...v, assignedDeviceId: formData.deviceId } : v
        );
        setVehicles(updatedVehicles);
        
        const updatedDevices = devices.map(d =>
            d._id === formData.deviceId ? { ...d, assignedVehicleId: formData.vehicleId } : d
        );
        setDevices(updatedDevices);
        
        toast.success("Device assigned successfully");
        closeModal();
    };

    const handleUnassign = async (id: string) => {
        if (confirm("Are you sure you want to unassign this device?")) {
            const mapping = mappings.find(m => m._id === id);
            if (mapping) {
                // Update vehicle and device to remove assignment
                const updatedVehicles = vehicles.map(v => 
                    v._id === mapping.vehicleId ? { ...v, assignedDeviceId: null } : v
                );
                setVehicles(updatedVehicles);
                
                const updatedDevices = devices.map(d =>
                    d._id === mapping.deviceId ? { ...d, assignedVehicleId: null } : d
                );
                setDevices(updatedDevices);
            }
            const updated = mappings.filter((mapping: any) => mapping._id !== id);
            setMappingsState(updated);
            setMappings(updated);
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
        { 
            header: "Vehicle", 
            accessor: (row: any) => {
                const vehicle = vehicles.find(v => v._id === (row.vehicleId?._id || row.vehicleId));
                return vehicle?.vehicleNumber || "Unknown";
            }
        },
        { 
            header: "Organization", 
            accessor: (row: any) => {
                const vehicle = vehicles.find(v => v._id === (row.vehicleId?._id || row.vehicleId));
                const orgId = vehicle?.organizationId;
                // Would need to get org name from organizations list
                return orgId || "N/A";
            }
        },
        { 
            header: "Device IMEI", 
            accessor: (row: any) => {
                const device = devices.find(d => d._id === (row.deviceId?._id || row.deviceId));
                return device?.imei || "Unknown";
            }
        },
        { header: "Assigned Date", accessor: (row: any) => new Date(row.createdAt).toLocaleDateString() },
        {
            header: "Actions", accessor: (row: any) => (
                <button onClick={() => handleUnassign(row._id)} className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700">
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
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Operations</p>
                        <h1 className="text-2xl font-black text-slate-900">Device Mapping</h1>
                        <p className="text-sm text-slate-500">Associate GPS devices with vehicles.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
                    >
                        <span className="inline-flex items-center gap-2"><Link2 size={16} /> Assign Device</span>
                    </button>
                </div>

            <Table columns={columns} data={mappings} loading={false} />

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
                                    {availableVehicles?.map((v: any) => (
                                        <option key={v._id} value={v._id}>{v.vehicleNumber} {v.model ? `(${v.model})` : ""}</option>
                                    ))}
                                </select>
                                {availableVehicles?.length === 0 && <p className="mt-1 text-xs font-semibold text-rose-600">No available vehicles found</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Select Device</label>
                                <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={formData.deviceId} onChange={e => setFormData({ ...formData, deviceId: e.target.value })}>
                                    <option value="">Select available device...</option>
                                    {availableDevices?.map((d: any) => (
                                        <option key={d._id} value={d._id}>{d.imei}</option>
                                    ))}
                                </select>
                                {availableDevices?.length === 0 && <p className="mt-1 text-xs font-semibold text-rose-600">No available devices found</p>}
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200">Cancel</button>
                                <button type="submit" disabled={!formData.vehicleId || !formData.deviceId} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">Assign</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </ApiErrorBoundary>
    );
}
