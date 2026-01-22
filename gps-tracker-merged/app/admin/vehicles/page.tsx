"use client";

import { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { getVehicles, getOrganizations, getDevices, setVehicles, setDevices, type Vehicle } from "@/lib/admin-dummy-data";

import { validators, validateForm } from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

function VehiclesContent() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");
    const [vehicles, setVehiclesState] = useState(getVehicles());
    const [organizations] = useState(getOrganizations());
    const [devices] = useState(getDevices());
    const [showFilters, setShowFilters] = useState(false);
    const [selectedVehicleForAssignment, setSelectedVehicleForAssignment] = useState<any>(null);
    const [filters, setFilters] = useState({
        organizationId: "",
        status: "",
        deviceAssigned: ""
    });
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [formData, setFormData] = useState({
        organizationId: "",
        vehicleType: "car",
        vehicleNumber: "",
        model: "",
        driverName: "",
        year: "",
        color: "",
        status: "active" as "active" | "inactive" | "online" | "offline",
        assignedDeviceId: "" as string | null
    });
    const [errors, setErrors] = useState<any>({});

    const filteredVehicles = useMemo(() => {
        let filtered = vehicles;

        // Apply URL filter (for dashboard card click)
        if (filterParam === "online") {
            filtered = filtered.filter(v => v.status === "online");
        }

        // Apply manual filters
        if (filters.organizationId) {
            filtered = filtered.filter(v => v.organizationId === filters.organizationId);
        }
        if (filters.status) {
            filtered = filtered.filter(v => v.status === filters.status);
        }
        if (filters.deviceAssigned === "assigned") {
            filtered = filtered.filter(v => v.assignedDeviceId);
        } else if (filters.deviceAssigned === "unassigned") {
            filtered = filtered.filter(v => !v.assignedDeviceId);
        }

        return filtered;
    }, [vehicles, filters, filterParam]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use validators
        const validationRules = {
            organizationId: [validators.required],
            vehicleNumber: [validators.required],
            vehicleType: [validators.required]
        };

        const { isValid, errors: validationErrors } = validateForm(formData, validationRules);

        if (!isValid) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        if (editingVehicle) {
            const updated = vehicles.map((vehicle) =>
                vehicle._id === editingVehicle._id ? { ...vehicle, ...formData } : vehicle
            );
            setVehiclesState(updated);
            setVehicles(updated);
            toast.success("Vehicle updated successfully");
        } else {
            const newVehicle: Vehicle = {
                _id: `veh_${Date.now()}`,
                organizationId: formData.organizationId,
                vehicleType: formData.vehicleType,
                vehicleNumber: formData.vehicleNumber,
                model: formData.model,
                driverName: formData.driverName,
                year: formData.year,
                color: formData.color,
                status: formData.status,
                assignedDeviceId: null,
            };
            const updated = [...vehicles, newVehicle];
            setVehiclesState(updated);
            setVehicles(updated);
            toast.success("Vehicle created successfully");
        }
        closeModal();
    };

    const openCreateModal = () => {
        setEditingVehicle(null);
        setFormData({
            organizationId: "",
            vehicleType: "car",
            vehicleNumber: "",
            model: "",
            driverName: "",
            year: "",
            color: "",
            status: "active",
            assignedDeviceId: null
        });
        setErrors({});
        openPopup("vehicleModal");
    };

    const openEditModal = (vehicle: any) => {
        setEditingVehicle(vehicle);
        setFormData({
            organizationId: vehicle.organizationId?._id || vehicle.organizationId,
            vehicleType: vehicle.vehicleType || "car",
            vehicleNumber: vehicle.vehicleNumber || "",
            model: vehicle.model || "",
            driverName: vehicle.driverName || "",
            year: vehicle.year || "",
            color: vehicle.color || "",
            status: vehicle.status || "active",
            assignedDeviceId: vehicle.assignedDeviceId || null
        });
        setErrors({});
        openPopup("vehicleModal");
    };

    const closeModal = () => {
        closePopup("vehicleModal");
        setEditingVehicle(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this vehicle?")) {
            const updated = vehicles.filter((vehicle) => vehicle._id !== id);
            setVehiclesState(updated);
            setVehicles(updated);
            toast.success("Vehicle deleted");
        }
    }

    const clearFilters = () => {
        setFilters({ organizationId: "", status: "", deviceAssigned: "" });
    };

    const openAssignDeviceModal = (vehicle: any) => {
        setSelectedVehicleForAssignment(vehicle);
        openPopup("assignDeviceModal");
    };

    const handleAssignDevice = (deviceId: string) => {
        if (!selectedVehicleForAssignment) return;

        // Update vehicle with assigned device
        const updatedVehicles = vehicles.map(v =>
            v._id === selectedVehicleForAssignment._id
                ? { ...v, assignedDeviceId: deviceId }
                : v
        );

        // Update device with assigned vehicle (bidirectional)
        const updatedDevices = devices.map(d =>
            d._id === deviceId
                ? { ...d, assignedVehicleId: selectedVehicleForAssignment._id }
                : d
        );

        setVehiclesState(updatedVehicles);
        setVehicles(updatedVehicles);
        setDevices(updatedDevices);

        closePopup("assignDeviceModal");
        setSelectedVehicleForAssignment(null);
        toast.success("Device assigned successfully");
    };

    const availableDevices = devices.filter(d => !d.assignedVehicleId);

    const columns = [
        { header: "Number", accessor: "vehicleNumber" },
        { header: "Type", accessor: (row: any) => <span className="capitalize">{capitalizeFirstLetter(row.vehicleType)}</span> },
        { header: "Model", accessor: "model" },
        { header: "Driver", accessor: (row: any) => row.driverName || "Unassigned" },
        {
            header: "Organization",
            accessor: (row: any) => {
                const org = organizations.find(o => o._id === row.organizationId);
                return org?.name || "N/A";
            }
        },
        {
            header: "Status", accessor: (row: any) => {
                const statusColors: Record<string, string> = {
                    online: "bg-green-100 text-green-700",
                    offline: "bg-red-100 text-red-700",
                    active: "bg-blue-100 text-blue-700",
                    inactive: "bg-gray-100 text-gray-700"
                };
                return (
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${statusColors[row.status] || "bg-gray-100 text-gray-700"}`}>
                        {capitalizeFirstLetter(row.status || "active")}
                    </span>
                );
            }
        },
        {
            header: "Device", accessor: (row: any) => {
                if (!row.assignedDeviceId) {
                    return (
                        <button
                            onClick={() => openAssignDeviceModal(row)}
                            className="text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                            Unassigned
                        </button>
                    );
                }
                const device = devices.find(d => d._id === row.assignedDeviceId);
                return device ? device.imei : "Unknown";
            }
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Vehicles</h1>
                        <p className="text-sm text-slate-500">Manage your fleet vehicles here.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
                        >
                            <Filter size={16} /> Filtered Vehicles
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            <Plus size={16} /> Add Vehicle
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Organization</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                    value={filters.organizationId}
                                    onChange={e => setFilters({ ...filters, organizationId: e.target.value })}
                                >
                                    <option value="">All Organizations</option>
                                    {organizations.map((org: any) => (
                                        <option key={org._id} value={org._id}>{org.name}</option>
                                    ))}
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
                                    <option value="online">Online</option>
                                    <option value="offline">Offline</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Device</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                    value={filters.deviceAssigned}
                                    onChange={e => setFilters({ ...filters, deviceAssigned: e.target.value })}
                                >
                                    <option value="">All</option>
                                    <option value="assigned">Assigned</option>
                                    <option value="unassigned">Unassigned</option>
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

                <Table columns={columns} data={filteredVehicles} loading={false} />

                {isPopupOpen("vehicleModal") && (
                    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
                            <h2 className="text-xl font-bold mb-4">{editingVehicle ? "Edit Vehicle" : "New Vehicle"}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Organization</label>
                                        <select className={`w-full border ${errors.organizationId ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                            value={formData.organizationId} onChange={e => setFormData({ ...formData, organizationId: e.target.value })}>
                                            <option value="">Select Organization</option>
                                            {organizations.map((org: any) => (
                                                <option key={org._id} value={org._id}>{org.name}</option>
                                            ))}
                                        </select>
                                        {errors.organizationId && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.organizationId}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vehicle Type</label>
                                        <select required className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                            value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}>
                                            <option value="car">Car</option>
                                            <option value="truck">Truck</option>
                                            <option value="bus">Bus</option>
                                            <option value="bike">Bike</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Vehicle Number</label>
                                    <input type="text" className={`w-full border ${errors.vehicleNumber ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })} />
                                    {errors.vehicleNumber && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.vehicleNumber}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Model</label>
                                        <input type="text" className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                            value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Year</label>
                                        <input type="text" className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                            value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Color</label>
                                        <input type="text" className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                            value={formData.color} onChange={e => setFormData({ ...formData, color: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                                        <select className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                            value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                            <option value="online">Online</option>
                                            <option value="offline">Offline</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assign GPS Device</label>
                                    <select className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                        value={formData.assignedDeviceId || ""}
                                        onChange={e => {
                                            const deviceId = e.target.value || null;
                                            setFormData({ ...formData, assignedDeviceId: deviceId });

                                            // Update device bidirectionally
                                            if (deviceId) {
                                                const updatedDevices = devices.map(d =>
                                                    d._id === deviceId
                                                        ? { ...d, assignedVehicleId: editingVehicle?._id || null }
                                                        : d
                                                );
                                                setDevices(updatedDevices);
                                            }
                                        }}
                                    >
                                        <option value="">Unassigned</option>
                                        {availableDevices.map((device: any) => (
                                            <option key={device._id} value={device._id}>{device.imei} ({device.model})</option>
                                        ))}
                                        {editingVehicle?.assignedDeviceId && (
                                            <option value={editingVehicle.assignedDeviceId}>
                                                {devices.find(d => d._id === editingVehicle.assignedDeviceId)?.imei} (Current)
                                            </option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Driver Name</label>
                                    <input type="text" className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                        value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} />
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                                    <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isPopupOpen("assignDeviceModal") && (
                    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
                            <h2 className="text-xl font-bold mb-4">Assign GPS Device</h2>
                            <p className="text-sm text-slate-500 mb-4">
                                Assign a GPS device to <strong>{selectedVehicleForAssignment?.vehicleNumber}</strong>
                            </p>
                            {availableDevices.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-xl text-center">
                                    <p className="text-sm font-semibold text-slate-600">No device available</p>
                                    <p className="text-xs text-slate-500 mt-1">All devices are currently assigned</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {availableDevices.map((device: any) => (
                                        <button
                                            key={device._id}
                                            onClick={() => handleAssignDevice(device._id)}
                                            className="w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="font-semibold text-sm">{device.imei}</div>
                                            <div className="text-xs text-slate-500">{device.model} • {device.simNumber}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => {
                                        closePopup("assignDeviceModal");
                                        setSelectedVehicleForAssignment(null);
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

export default function VehiclesPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading...</div>}>
            <VehiclesContent />
        </Suspense>
    );
}
