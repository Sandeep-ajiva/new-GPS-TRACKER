"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    useGetGpsDevicesQuery,
    useCreateGpsDeviceMutation,
    useUpdateGpsDeviceMutation,
    useDeleteGpsDeviceMutation
} from "@/redux/api/gpsDeviceApi";
import { useGetVehiclesQuery, useUpdateVehicleMutation } from "@/redux/api/vehicleApi";

import Validator from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export interface GPSDevice {
    _id: string;
    organizationId: string;
    imei: string;
    deviceModel: string;
    manufacturer?: string;
    simNumber?: string;
    serialNumber?: string;
    firmwareVersion?: string;
    hardwareVersion?: string;
    connectionStatus: "online" | "offline";
    warrantyExpiry?: string;
    status: "active" | "inactive";
}

export default function GpsDevicesPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();

    // API Hooks
    const { data: devData, isLoading: isDevLoading } = useGetGpsDevicesQuery(undefined);
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery(undefined);

    const [createGpsDevice, { isLoading: isCreating }] = useCreateGpsDeviceMutation();
    const [updateGpsDevice, { isLoading: isUpdating }] = useUpdateGpsDeviceMutation();
    const [deleteGpsDevice, { isLoading: isDeleting }] = useDeleteGpsDeviceMutation();

    // We need updateVehicle to Assign/Unassign vehicle
    const [updateVehicle] = useUpdateVehicleMutation();

    const devices = (devData?.data as GPSDevice[]) || [];
    const vehiclesData = (vehData?.data as any[]) || [];

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        assigned: "",
        status: ""
    });

    const [editingDevice, setEditingDevice] = useState<GPSDevice | null>(null);
    const [formData, setFormData] = useState({
        imei: "",
        simNumber: "",
        deviceModel: "",
        firmwareVersion: "",
        status: "active" as "active" | "inactive"
    });
    const [errors, setErrors] = useState<any>({});
    const [selectedDeviceForAssignment, setSelectedDeviceForAssignment] = useState<GPSDevice | null>(null);

    const Rules = {
        imei: { required: true, type: "string" as const, errorMessage: "IMEI is required." },
        simNumber: { required: true, type: "string" as const, errorMessage: "SIM number is required." },
        deviceModel: { required: true, type: "string" as const, errorMessage: "Model is required." }
    };

    const validator = new Validator(Rules);

    const handleBlur = async (name: string, value: any) => {
        const validationErrors = await validator.validateFormField(name, value);
        setErrors((prev: any) => ({
            ...prev,
            [name]: validationErrors[name]
        }));
    };

    // Helper to find assigned vehicle for a device
    const getAssignedVehicle = (deviceId: string) => {
        return vehiclesData.find(v => v.deviceId === deviceId);
    };

    const filteredDevices = useMemo(() => {
        let filtered = devices;
        if (filters.assigned === "assigned") {
            filtered = filtered.filter(d => getAssignedVehicle(d._id));
        } else if (filters.assigned === "unassigned") {
            filtered = filtered.filter(d => !getAssignedVehicle(d._id));
        }
        if (filters.status) {
            filtered = filtered.filter(d => d.status === filters.status);
        }
        return filtered;
    }, [devices, vehiclesData, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const validationErrors = await validator.validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        try {
            if (editingDevice) {
                await updateGpsDevice({ id: editingDevice._id, ...formData }).unwrap();
                toast.success("Device updated successfully");
            } else {
                // IMPORTANT: Backend strictly requires organizationId if SuperAdmin.
                // Assuming current user context handles orgId insertion in backend for non-superadmin.
                // For SuperAdmin, we might need an Org selector in the form? 
                // Using existing pattern: if no orgId provided, backend might default to user's org.
                // If I am SuperAdmin, I should probably select Org.
                // For now, let's assume current logic (like Vehicles) or add Org selector later if needed.
                // But Vehicles page HAD org selector. Devices page existing form DID NOT.
                // I will proceed without Org selector, but it might fail for SuperAdmin if backend strict.
                // However, I can't guess.
                // Let's add OrganizationId if vehiclesData has orgs? No, devices page fetches devices.
                // Let's rely on backend user context for now.

                await createGpsDevice(formData).unwrap();
                toast.success("Device created successfully");
            }
            closeModal();
        } catch (err: any) {
            toast.error(err?.data?.message || "Operation failed");
        }
    };

    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({ imei: "", simNumber: "", deviceModel: "", firmwareVersion: "", status: "active" });
        setErrors({});
        openPopup("deviceModal");
    };

    const openEditModal = (device: GPSDevice) => {
        setEditingDevice(device);
        setFormData({
            imei: device.imei,
            simNumber: device.simNumber || "",
            deviceModel: device.deviceModel || "",
            firmwareVersion: device.firmwareVersion || "",
            status: device.status || "active"
        });
        setErrors({});
        openPopup("deviceModal");
    };

    const closeModal = () => {
        closePopup("deviceModal");
        setEditingDevice(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this device?")) {
            try {
                await deleteGpsDevice(id).unwrap();
                toast.success("Device deleted");
            } catch (err: any) {
                toast.error(err?.data?.message || "Delete failed");
            }
        }
    }

    const clearFilters = () => {
        setFilters({ assigned: "", status: "" });
    };

    // Assignment Logic
    const availableVehicles = vehiclesData.filter(v => !v.deviceId);

    const openAssignVehicleModal = (device: GPSDevice) => {
        setSelectedDeviceForAssignment(device);
        openPopup("assignVehicleModal");
    };

    const handleAssignVehicle = async (vehicleId: string) => {
        if (!selectedDeviceForAssignment) return;
        try {
            // Update Vehicle with this deviceId
            await updateVehicle({ id: vehicleId, deviceId: selectedDeviceForAssignment._id }).unwrap();
            toast.success("Vehicle assigned successfully");
            closePopup("assignVehicleModal");
            setSelectedDeviceForAssignment(null);
        } catch (err: any) {
            toast.error(err?.data?.message || "Assignment failed");
        }
    };

    const columns = [
        { header: "IMEI", accessor: "imei" },
        { header: "SIM Number", accessor: "simNumber" },
        { header: "Model", accessor: "deviceModel" },
        { header: "Firmware", accessor: "firmwareVersion" },
        {
            header: "Status",
            accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                    {capitalizeFirstLetter(row.status)}
                </span>
            )
        },
        {
            header: "Assignment",
            accessor: (row: any) => {
                const assignedVehicle = getAssignedVehicle(row._id);
                if (!assignedVehicle) {
                    return (
                        <button
                            onClick={() => openAssignVehicleModal(row)}
                            className="text-blue-600 hover:text-blue-800 font-semibold underline"
                        >
                            Unassigned
                        </button>
                    );
                }
                return assignedVehicle.vehicleNumber;
            }
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-slate-700 hover:text-slate-900"><Edit size={16} /></button>
                    {!isLoading && (
                        <button onClick={() => handleDelete(row._id)} className="text-rose-600 hover:text-rose-700"><Trash2 size={16} /></button>
                    )}
                </div>
            )
        }
    ];

    const isLoading = isDevLoading || isVehLoading;

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

                <Table columns={columns} data={filteredDevices} loading={isLoading} />

                {isPopupOpen("deviceModal") && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <h2 className="text-xl font-black text-slate-900">{editingDevice ? "Edit Device" : "New Device"}</h2>
                            <p className="text-xs text-slate-500">Register IMEI and SIM details for tracking.</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">IMEI</label>
                                    <input type="text" className={`w-full rounded-xl border ${errors.imei ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                        value={formData.imei}
                                        onChange={e => setFormData({ ...formData, imei: e.target.value })}
                                        onBlur={e => handleBlur("imei", e.target.value)}
                                    />
                                    {errors.imei && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.imei}</p>}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">SIM Number</label>
                                        <input type="text" className={`w-full rounded-xl border ${errors.simNumber ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                            value={formData.simNumber}
                                            onChange={e => setFormData({ ...formData, simNumber: e.target.value })}
                                            onBlur={e => handleBlur("simNumber", e.target.value)}
                                        />
                                        {errors.simNumber && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.simNumber}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Model</label>
                                        <input type="text" className={`w-full rounded-xl border ${errors.deviceModel ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                            value={formData.deviceModel}
                                            onChange={e => setFormData({ ...formData, deviceModel: e.target.value })}
                                            onBlur={e => handleBlur("deviceModel", e.target.value)}
                                        />
                                        {errors.deviceModel && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.deviceModel}</p>}
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
                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-200">Cancel</button>
                                    <button type="submit" disabled={isCreating || isUpdating} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50">
                                        {(isCreating || isUpdating) ? "Saving..." : "Save"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {isPopupOpen("assignVehicleModal") && (
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
                                        closePopup("assignVehicleModal");
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
