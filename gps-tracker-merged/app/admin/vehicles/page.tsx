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

import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";
import { Building2, Car, Hash, Info, Calendar, Palette, ToggleLeft, ShieldAlert, Image as ImageIcon } from "lucide-react";



export interface Vehicle {
    _id: string;
    organizationId: string | { _id: string; name: string };
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

    const vehicles = useMemo(() => (vehData?.data as Vehicle[]) || [], [vehData]);
    const organizations = useMemo(() => (orgData?.data as { _id: string; name: string }[]) || [], [orgData]);
    const devices = useMemo(() => (devData?.data as { _id: string; imei: string; deviceModel: string; connectionStatus?: string }[]) || [], [devData]);


    const [showFilters, setShowFilters] = useState(false);
    const [selectedVehicleForAssignment, setSelectedVehicleForAssignment] = useState<Vehicle | null>(null);
    const [filters, setFilters] = useState({
        organizationId: "",
        status: "",
        deviceAssigned: ""
    });

    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);




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

    const handleSubmit = async (data: Record<string, string | number | boolean | File>) => {
        try {
            const formData = new FormData();
            
            // Required backend fields
            formData.append("organizationId", String(data.organizationId));
            formData.append("vehicleType", String(data.vehicleType));
            formData.append("vehicleNumber", String(data.vehicleNumber).toUpperCase());
            
            // Optional fields
            if (data.model) formData.append("model", String(data.model));
            if (data.year) formData.append("year", String(data.year));
            if (data.color) formData.append("color", String(data.color));
            if (data.status) formData.append("status", String(data.status));
            if (data.deviceId) formData.append("deviceId", String(data.deviceId));
            
            // File
            if (data.image instanceof File) {
                formData.append("image", data.image);
            }

            if (editingVehicle) {
                // For update, if multipart/form-data is not supported, we can convert to object
                // but the controller handles req.file, so it DOES support it.
                await updateVehicle({ id: editingVehicle._id, ...Object.fromEntries(formData) }).unwrap();
                toast.success("Vehicle updated successfully");
            } else {
                await createVehicle(formData).unwrap();
                toast.success("Vehicle created successfully");
            }
            closeModal();
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || "Operation failed");
        }
    };


    const vehicleFormFields: FormField[] = [
        {
            name: "organizationId",
            label: "Organization",
            type: "select",
            required: true,
            options: organizations.map(org => ({ label: org.name, value: org._id })),
            icon: <Building2 size={14} className="text-slate-500" />,
        },
        {
            name: "vehicleType",
            label: "Vehicle Type",
            type: "select",
            required: true,
            options: [
                { label: "Car", value: "car" },
                { label: "Truck", value: "truck" },
                { label: "Bus", value: "bus" },
                { label: "Bike", value: "bike" },
                { label: "Other", value: "other" },
            ],
            icon: <Car size={14} className="text-slate-500" />,
        },
        {
            name: "vehicleNumber",
            label: "Vehicle Number",
            type: "text",
            required: true,
            placeholder: "e.g. MH12AB1234",
            icon: <Hash size={14} className="text-slate-500" />,
        },
        {
            name: "model",
            label: "Model",
            type: "text",
            placeholder: "e.g. Fortuner",
            icon: <Info size={14} className="text-slate-500" />,
        },
        {
            name: "year",
            label: "Year",
            type: "number",
            placeholder: "e.g. 2024",
            icon: <Calendar size={14} className="text-slate-500" />,
        },
        {
            name: "color",
            label: "Color",
            type: "text",
            placeholder: "e.g. White",
            icon: <Palette size={14} className="text-slate-500" />,
        },
        {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
            icon: <ToggleLeft size={14} className="text-slate-500" />,
        },
        {
            name: "deviceId",
            label: "Assign GPS Device",
            type: "select",
            options: getAvailableDevices(editingVehicle?._id).map(d => ({ label: `${d.imei} (${d.deviceModel})`, value: d._id })),
            icon: <ShieldAlert size={14} className="text-slate-500" />,
        },
        {
            name: "image",
            label: "Vehicle Image",
            type: "file",
            icon: <ImageIcon size={14} className="text-slate-500" />,
        },
    ];


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
        openPopup("vehicleModal");
    };

    const openEditModal = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
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
        { header: "Type", accessor: (row: Vehicle) => <span className="capitalize">{capitalizeFirstLetter(row.vehicleType)}</span> },
        { header: "Model", accessor: "model" },
        {
            header: "Organization",
            accessor: (row: Vehicle) => {
                // If populated, use name. If Id, find in list.
                if (row.organizationId && typeof row.organizationId === 'object') return row.organizationId.name;
                const org = organizations.find(o => o._id === row.organizationId);
                return org?.name || "N/A";
            }
        },
        {
            header: "Status", accessor: (row: Vehicle) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {capitalizeFirstLetter(row.status || "active")}
                </span>
            )
        },
        {
            header: "Device", accessor: (row: Vehicle) => {
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
            header: "Actions", accessor: (row: Vehicle) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    {(!isCreating && !isUpdating && !isDeleting) && (
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
                                    {organizations.map((org) => (
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

                <DynamicModal
                    isOpen={isPopupOpen("vehicleModal")}
                    onClose={closeModal}
                    title={editingVehicle ? "Edit Vehicle" : "New Vehicle"}
                    description="Configure vehicle details and fleet assignment."
                    fields={vehicleFormFields}
                    initialData={editingVehicle ? {
                        organizationId: editingVehicle.organizationId?._id || editingVehicle.organizationId,
                        vehicleType: editingVehicle.vehicleType,
                        vehicleNumber: editingVehicle.vehicleNumber,
                        model: editingVehicle.model || "",
                        year: editingVehicle.year || "",
                        color: editingVehicle.color || "",
                        status: editingVehicle.status,
                        deviceId: editingVehicle.deviceId || "",
                    } : undefined}
                    onSubmit={handleSubmit}
                    submitLabel={editingVehicle ? "Update Vehicle" : "Create Vehicle"}
                />


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
                                    {getAvailableDevices().map((device) => (
                                        <button
                                            key={device._id}
                                            onClick={() => handleAssignDevice(device._id)}
                                            className="w-full p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors text-left"
                                        >
                                            <div className="font-semibold text-sm">{device.imei}</div>
                                            <div className="text-xs text-slate-500">{device.deviceModel} • {device.connectionStatus}</div>
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
