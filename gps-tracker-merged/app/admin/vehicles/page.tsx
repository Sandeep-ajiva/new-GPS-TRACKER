"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    useGetVehiclesQuery,
    useCreateVehicleMutation,
    useUpdateVehicleMutation,
    useDeleteVehicleMutation
} from "@/redux/api/vehicleApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";

import Validator from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export interface Vehicle {
    _id: string;
    organizationId: any;
    vehicleType: string;
    vehicleNumber: string;
    make?: string;
    model?: string;
    year?: string;
    color?: string;
    status: "active" | "inactive";
    runningStatus?: "running" | "idle" | "stopped" | "inactive";
    deviceId?: string;
    driverId?: string; // Backend uses driverId
    driverName?: string; // Frontend form uses this, might need mapping if backend supports it or ignored
}

export default function VehiclesPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();
    const searchParams = useSearchParams();
    const filterParam = searchParams.get("filter");

    // API Hooks
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery(undefined);
    const { data: orgData, isLoading: isOrgLoading } = useGetOrganizationsQuery(undefined);
    const { data: devData, isLoading: isDevLoading } = useGetGpsDevicesQuery(undefined);

    const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
    const [updateVehicle, { isLoading: isUpdating }] = useUpdateVehicleMutation();
    const [deleteVehicle, { isLoading: isDeleting }] = useDeleteVehicleMutation();

    const vehicles = (vehData?.data as Vehicle[]) || [];
    const organizations = (orgData?.data as any[]) || [];
    const devices = (devData?.data as any[]) || [];

    const [showFilters, setShowFilters] = useState(false);
    const [selectedVehicleForAssignment, setSelectedVehicleForAssignment] = useState<Vehicle | null>(null);
    const [filters, setFilters] = useState({
        organizationId: "",
        status: "",
        deviceAssigned: ""
    });

    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState({
        organizationId: "",
        vehicleType: "car",
        vehicleNumber: "",
        model: "",
        year: "",
        color: "",
        status: "active" as "active" | "inactive",
        deviceId: "" as string | null
    });
    const [errors, setErrors] = useState<any>({});

    const Rules = {
        organizationId: { required: true, errorMessage: "Organization is required." },
        vehicleNumber: { required: true, errorMessage: "Vehicle number is required." },
        vehicleType: { required: true, errorMessage: "Vehicle type is required." }
    };

    const validator = new Validator(Rules);

    const handleBlur = async (name: string, value: any) => {
        const validationErrors = await validator.validateFormField(name, value);
        setErrors((prev: any) => ({
            ...prev,
            [name]: validationErrors[name]
        }));
    };

    const filteredVehicles = useMemo(() => {
        let filtered = vehicles;

        if (filterParam === "online") {
            // Logic needs connection status check from device. 
            // We can map deviceId -> device -> connectionStatus
            filtered = filtered.filter(v => {
                const dev = devices.find(d => d._id === v.deviceId);
                return dev?.connectionStatus === 'online';
            });
        }

        if (filters.organizationId) {
            filtered = filtered.filter(v => (v.organizationId?._id || v.organizationId) === filters.organizationId);
        }
        if (filters.status) {
            filtered = filtered.filter(v => v.status === filters.status);
        }
        if (filters.deviceAssigned === "assigned") {
            filtered = filtered.filter(v => v.deviceId);
        } else if (filters.deviceAssigned === "unassigned") {
            filtered = filtered.filter(v => !v.deviceId);
        }

        return filtered;
    }, [vehicles, devices, filters, filterParam]);

    // Calculate available devices
    // Device is available if NOT used by ANY vehicle, OR if it is used by CURRENT editing vehicle
    const getAvailableDevices = (currentVehicleId?: string) => {
        const assignedDeviceIds = new Set(
            vehicles
                .filter(v => v._id !== currentVehicleId) // Exclude current vehicle's assignment
                .map(v => v.deviceId)
                .filter(Boolean)
        );
        return devices.filter(d => !assignedDeviceIds.has(d._id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = await validator.validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        const { deviceId, ...rest } = formData;
        // Only include deviceId if it has a value
        const payload = { ...rest, ...(deviceId ? { deviceId } : {}) };

        try {
            if (editingVehicle) {
                await updateVehicle({ id: editingVehicle._id, ...payload }).unwrap();
                toast.success("Vehicle updated successfully");
            } else {
                await createVehicle(payload).unwrap();
                toast.success("Vehicle created successfully");
            }
            closeModal();
        } catch (err: any) {
            toast.error(err?.data?.message || "Operation failed");
        }
    };

    const handleAssignDevice = async (deviceId: string) => {
        if (!selectedVehicleForAssignment) return;
        try {
            await updateVehicle({
                id: selectedVehicleForAssignment._id,
                deviceId: deviceId
            }).unwrap();
            toast.success("Device assigned successfully");
            closePopup("assignDeviceModal");
            setSelectedVehicleForAssignment(null);
        } catch (err: any) {
            toast.error(err?.data?.message || "Assignment failed");
        }
    };

    const openCreateModal = () => {
        setEditingVehicle(null);
        setFormData({
            organizationId: "",
            vehicleType: "car",
            vehicleNumber: "",
            model: "",
            year: "",
            color: "",
            status: "active",
            deviceId: null
        });
        setErrors({});
        openPopup("vehicleModal");
    };

    const openEditModal = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setFormData({
            organizationId: vehicle.organizationId?._id || vehicle.organizationId,
            vehicleType: vehicle.vehicleType || "car",
            vehicleNumber: vehicle.vehicleNumber || "",
            model: vehicle.model || "",
            year: vehicle.year || "",
            color: vehicle.color || "",
            status: vehicle.status || "active",
            deviceId: vehicle.deviceId || null
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
            try {
                await deleteVehicle(id).unwrap();
                toast.success("Vehicle deleted");
            } catch (err: any) {
                toast.error(err?.data?.message || "Delete failed");
            }
        }
    }

    const clearFilters = () => {
        setFilters({ organizationId: "", status: "", deviceAssigned: "" });
    };

    const openAssignDeviceModal = (vehicle: Vehicle) => {
        setSelectedVehicleForAssignment(vehicle);
        openPopup("assignDeviceModal");
    };

    const columns = [
        { header: "Number", accessor: "vehicleNumber" },
        { header: "Type", accessor: (row: any) => <span className="capitalize">{capitalizeFirstLetter(row.vehicleType)}</span> },
        { header: "Model", accessor: "model" },
        {
            header: "Organization",
            accessor: (row: any) => {
                // If populated, use name. If Id, find in list.
                if (row.organizationId && typeof row.organizationId === 'object') return row.organizationId.name;
                const org = organizations.find(o => o._id === row.organizationId);
                return org?.name || "N/A";
            }
        },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {capitalizeFirstLetter(row.status || "active")}
                </span>
            )
        },
        {
            header: "Device", accessor: (row: any) => {
                if (!row.deviceId) {
                    return (
                        <button
                            onClick={() => openAssignDeviceModal(row)}
                            className="text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                            Unassigned
                        </button>
                    );
                }
                const device = devices.find(d => d._id === row.deviceId);
                return device ? device.imei : "Unknown";
            }
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    {!isLoading && (
                        <button onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    )}
                </div>
            )
        }
    ];

    const isLoading = isVehLoading || isOrgLoading || isDevLoading;

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

                <Table columns={columns} data={filteredVehicles} loading={isLoading} />

                {isPopupOpen("vehicleModal") && (
                    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
                            <h2 className="text-xl font-bold mb-4">{editingVehicle ? "Edit Vehicle" : "New Vehicle"}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Organization</label>
                                        <select className={`w-full border ${errors.organizationId ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                            value={formData.organizationId}
                                            onChange={e => setFormData({ ...formData, organizationId: e.target.value })}
                                            onBlur={e => handleBlur("organizationId", e.target.value)}
                                            disabled={!!editingVehicle} // Usually org shouldn't change easily for vehicle, or check backend logic
                                        >
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
                                            value={formData.vehicleType}
                                            onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                                            onBlur={e => handleBlur("vehicleType", e.target.value)}
                                        >
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
                                        value={formData.vehicleNumber}
                                        onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                        onBlur={e => handleBlur("vehicleNumber", e.target.value)}
                                    />
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
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Assign GPS Device</label>
                                    <select className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                        value={formData.deviceId || ""}
                                        onChange={e => {
                                            const val = e.target.value || null;
                                            setFormData({ ...formData, deviceId: val });
                                        }}
                                    >
                                        <option value="">Unassigned</option>
                                        {getAvailableDevices(editingVehicle?._id).map((device: any) => (
                                            <option key={device._id} value={device._id}>{device.imei} ({device.deviceModel})</option>
                                        ))}
                                        {/* If currently assigned device is present, it is covered by getAvailableDevices logic passing editingVehicle._id */}
                                    </select>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                                    <button type="submit" disabled={isCreating || isUpdating} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50">
                                        {(isCreating || isUpdating) ? "Saving..." : "Save"}
                                    </button>
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
                            {getAvailableDevices().length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-xl text-center">
                                    <p className="text-sm font-semibold text-slate-600">No device available</p>
                                    <p className="text-xs text-slate-500 mt-1">All devices are currently assigned</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {getAvailableDevices().map((device: any) => (
                                        <button
                                            key={device._id}
                                            onClick={() => handleAssignDevice(device._id)}
                                            className="w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="font-semibold text-sm">{device.imei}</div>
                                            <div className="text-xs text-slate-500">{device.deviceModel} • {device.simNumber}</div>
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
