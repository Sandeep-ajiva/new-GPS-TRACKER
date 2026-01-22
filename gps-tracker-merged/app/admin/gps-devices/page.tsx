"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { getDevices, getVehicles, setDevices, setVehicles, type GPSDevice } from "@/lib/admin-dummy-data";

export default function GpsDevicesPage() {
    const [devices, setDevicesState] = useState(getDevices());
    const [vehicles] = useState(getVehicles());
    const [showFilters, setShowFilters] = useState(false);
    const [isAssignVehicleModalOpen, setIsAssignVehicleModalOpen] = useState(false);
    const [selectedDeviceForAssignment, setSelectedDeviceForAssignment] = useState<any>(null);
    const [filters, setFilters] = useState({
        assigned: "",
        status: ""
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any>(null);
    const [formData, setFormData] = useState({
        imei: "",
        simNumber: "",
        model: "",
        firmwareVersion: "",
        status: "active" as "active" | "inactive",
        assignedVehicleId: null as string | null
    });

    const filteredDevices = useMemo(() => {
        let filtered = devices;
        if (filters.assigned === "assigned") {
            filtered = filtered.filter(d => d.assignedVehicleId);
        } else if (filters.assigned === "unassigned") {
            filtered = filtered.filter(d => !d.assignedVehicleId);
        }
        if (filters.status) {
            filtered = filtered.filter(d => d.status === filters.status);
        }
        return filtered;
    }, [devices, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDevice) {
            const updated = devices.map((device) =>
                device._id === editingDevice._id ? { ...device, ...formData } : device
            );
            setDevicesState(updated);
            setDevices(updated);
            toast.success("Device updated successfully");
        } else {
            const newDevice: GPSDevice = {
                _id: `gps_${Date.now()}`,
                imei: formData.imei,
                simNumber: formData.simNumber,
                model: formData.model,
                firmwareVersion: formData.firmwareVersion,
                status: formData.status,
                assignedVehicleId: null,
                lastSeen: new Date().toISOString(),
            };
            const updated = [...devices, newDevice];
            setDevicesState(updated);
            setDevices(updated);
            toast.success("Device created successfully");
        }
        closeModal();
    };

    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({ imei: "", simNumber: "", model: "", firmwareVersion: "", status: "active", assignedVehicleId: null });
        setIsModalOpen(true);
    };

    const openEditModal = (device: any) => {
        setEditingDevice(device);
        setFormData({
            imei: device.imei,
            simNumber: device.simNumber || "",
            model: device.model || "",
            firmwareVersion: device.firmwareVersion || "",
            status: device.status || "active",
            assignedVehicleId: device.assignedVehicleId || null
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDevice(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this device?")) {
            const updated = devices.filter((device) => device._id !== id);
            setDevicesState(updated);
            setDevices(updated);
            toast.success("Device deleted");
        }
    }

    const clearFilters = () => {
        setFilters({ assigned: "", status: "" });
    };

    const openAssignVehicleModal = (device: any) => {
        setSelectedDeviceForAssignment(device);
        setIsAssignVehicleModalOpen(true);
    };

    const handleAssignVehicle = (vehicleId: string) => {
        if (!selectedDeviceForAssignment) return;

        // Update device with assigned vehicle
        const updatedDevices = devices.map(d =>
            d._id === selectedDeviceForAssignment._id
                ? { ...d, assignedVehicleId: vehicleId }
                : d
        );

        // Update vehicle with assigned device (bidirectional)
        const updatedVehicles = vehicles.map(v =>
            v._id === vehicleId
                ? { ...v, assignedDeviceId: selectedDeviceForAssignment._id }
                : v
        );

        setDevicesState(updatedDevices);
        setDevices(updatedDevices);
        setVehicles(updatedVehicles);

        setIsAssignVehicleModalOpen(false);
        setSelectedDeviceForAssignment(null);
        toast.success("Vehicle assigned successfully");
    };

    const availableVehicles = vehicles.filter(v => !v.assignedDeviceId);

    const columns = [
        { header: "IMEI", accessor: "imei" },
        { header: "SIM Number", accessor: "simNumber" },
        { header: "Model", accessor: "model" },
        { header: "Firmware", accessor: "firmwareVersion" },
        {
            header: "Status",
            accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                    {row.status}
                </span>
            )
        },
        {
            header: "Assignment",
            accessor: (row: any) => {
                if (!row.assignedVehicleId) {
                    return (
                        <button
                            onClick={() => openAssignVehicleModal(row)}
                            className="text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                            Unassigned
                        </button>
                    );
                }
                const vehicle = vehicles.find(v => v._id === row.assignedVehicleId);
                return vehicle ? vehicle.vehicleNumber : "Unknown";
            }
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-slate-700 hover:text-slate-900"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(row._id)} className="text-rose-600 hover:text-rose-700"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Hardware</p>
                        <h1 className="text-2xl font-black text-slate-900">GPS Devices</h1>
                        <p className="text-sm text-slate-500">Manage your GPS hardware inventory.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-200"
                        >
                            <span className="inline-flex items-center gap-2"><Filter size={16} /> Filter GPS Devices</span>
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
                        >
                            <span className="inline-flex items-center gap-2"><Plus size={16} /> Add Device</span>
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assignment</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                    value={filters.assigned}
                                    onChange={e => setFilters({ ...filters, assigned: e.target.value })}
                                >
                                    <option value="">All</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="unassigned">Unassigned</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                    value={filters.status}
                                    onChange={e => setFilters({ ...filters, status: e.target.value })}
                                >
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={clearFilters}
                                    className="w-full bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <Table columns={columns} data={filteredDevices} loading={false} />

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <h2 className="text-xl font-black text-slate-900">{editingDevice ? "Edit Device" : "New Device"}</h2>
                            <p className="text-xs text-slate-500">Register IMEI and SIM details for tracking.</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">IMEI</label>
                                    <input type="text" required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.imei} onChange={e => setFormData({ ...formData, imei: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">SIM Number</label>
                                        <input type="text" className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                            value={formData.simNumber} onChange={e => setFormData({ ...formData, simNumber: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Model</label>
                                        <input type="text" className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                            value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Firmware Version</label>
                                        <input type="text" className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                            value={formData.firmwareVersion} onChange={e => setFormData({ ...formData, firmwareVersion: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</label>
                                        <select className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                            value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Assign Vehicle</label>
                                    <select className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.assignedVehicleId || ""}
                                        onChange={e => {
                                            const vehicleId = e.target.value || null;
                                            setFormData({ ...formData, assignedVehicleId: vehicleId });

                                            // Update vehicle bidirectionally
                                            if (vehicleId) {
                                                const updatedVehicles = vehicles.map(v =>
                                                    v._id === vehicleId
                                                        ? { ...v, assignedDeviceId: editingDevice?._id || null }
                                                        : v
                                                );
                                                setVehicles(updatedVehicles);
                                            }
                                        }}
                                    >
                                        <option value="">Unassigned</option>
                                        {availableVehicles.map((vehicle: any) => (
                                            <option key={vehicle._id} value={vehicle._id}>{vehicle.vehicleNumber} ({vehicle.model})</option>
                                        ))}
                                        {editingDevice?.assignedVehicleId && (
                                            <option value={editingDevice.assignedVehicleId}>
                                                {vehicles.find(v => v._id === editingDevice.assignedVehicleId)?.vehicleNumber} (Current)
                                            </option>
                                        )}
                                    </select>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200">Cancel</button>
                                    <button type="submit" className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-slate-800">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isAssignVehicleModalOpen && (
                    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
                            <h2 className="text-xl font-bold mb-4">Assign Vehicle</h2>
                            <p className="text-sm text-slate-500 mb-4">
                                Assign a vehicle to device <strong>{selectedDeviceForAssignment?.imei}</strong>
                            </p>
                            {availableVehicles.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-xl text-center">
                                    <p className="text-sm font-semibold text-slate-600">No vehicle available</p>
                                    <p className="text-xs text-slate-500 mt-1">All vehicles are currently assigned</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {availableVehicles.map((vehicle: any) => (
                                        <button
                                            key={vehicle._id}
                                            onClick={() => handleAssignVehicle(vehicle._id)}
                                            className="w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="font-semibold text-sm">{vehicle.vehicleNumber}</div>
                                            <div className="text-xs text-slate-500">{vehicle.model} • {vehicle.vehicleType}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsAssignVehicleModalOpen(false);
                                        setSelectedDeviceForAssignment(null);
                                    }}
                                    className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ApiErrorBoundary>
    );
}
