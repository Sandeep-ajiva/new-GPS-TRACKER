"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Link2, Trash2, Loader2, Filter, Car, Cpu, ArrowRight, X, Info, Briefcase } from "lucide-react";
import { toast } from "sonner";
import {
    useGetDeviceMappingsQuery,
    useAssignDeviceMutation,
    useUnassignDeviceMutation
} from "@/redux/api/deviceMappingApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
// 🔐 ORG CONTEXT UPDATE
import { useOrgContext } from "@/hooks/useOrgContext";
// 🔧 ACTIVE STATUS FILTERING
import { isActiveStatus, filterExcludedIds } from "@/utils/mappingHelpers";

export default function DeviceMappingPage() {
    // 🔐 ORG CONTEXT UPDATE
  const { role, orgId, isSuperAdmin, isRootOrgAdmin } = useOrgContext();

    // API Hooks
    const { data: mappingData, isLoading: isMappingLoading } = useGetDeviceMappingsQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });
    const { data: devData, isLoading: isDevLoading } = useGetGpsDevicesQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });

  const canFilterOrg = isSuperAdmin || isRootOrgAdmin;

  // 🔐 Superadmin + root admin can see scoped org list
    const { data: orgData, isLoading: isOrgLoading } = useGetOrganizationsQuery(undefined, {
    skip: !canFilterOrg,
        refetchOnMountOrArgChange: true
    });

    // Mutations
    const [assignDevice, { isLoading: isAssigning }] = useAssignDeviceMutation();
    const [unassignDevice, { isLoading: isUnassigning }] = useUnassignDeviceMutation();

    const mappings = Array.isArray(mappingData?.data) ? mappingData.data : [];
    const vehicles = Array.isArray(vehData?.data) ? vehData.data : [];
    const devices = Array.isArray(devData?.data) ? devData.data : [];
    const organizations = useMemo(() => (orgData?.data as any[]) || [], [orgData]);

    const isAdminUser = role === "admin";

    // 🔐 ORG CONTEXT UPDATE
    const canAssign = isSuperAdmin || isAdminUser;
    const canUnassign = isSuperAdmin || isAdminUser;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [formData, setFormData] = useState({ vehicleId: "", deviceId: "" });
    const [modalOrgFilter, setModalOrgFilter] = useState(""); // 🔐 Organization filter for modal
    const [filters, setFilters] = useState({
        vehicleNumber: "",
        imei: "",
        organizationId: "",
        assignedDate: "",
    });

    const getEntityId = (value: any) => {
        if (!value) return null;
        if (typeof value === "object") return value._id?.toString?.() || null;
        return value.toString?.() || null;
    };

    const assignedVehicleIds = new Set(
        mappings.map((m: any) => getEntityId(m.vehicleId)).filter(Boolean),
    );
    const assignedDeviceIds = new Set(
        mappings.map((m: any) => getEntityId(m.gpsDeviceId)).filter(Boolean),
    );

    const availableVehicles = useMemo(
        () => {
            // ✅ FIXED: Filter by both unassigned AND active status
            const unassignedVehicles = filterExcludedIds(vehicles || [], assignedVehicleIds);
            return unassignedVehicles.filter((v: any) => isActiveStatus(v.status));
        },
        [vehicles, assignedVehicleIds],
    );
    const availableDevices = useMemo(
        () => {
            // ✅ FIXED: Filter by both unassigned AND active status
            const unassignedDevices = filterExcludedIds(devices || [], assignedDeviceIds);
            return unassignedDevices.filter((d: any) => isActiveStatus(d.status));
        },
        [devices, assignedDeviceIds],
    );

    // 🔐 Filter vehicles by selected organization in modal (for superadmin/rootOrgAdmin)
    const vehiclesByModalOrg = useMemo(() => {
    if (!modalOrgFilter) return availableVehicles;
        return availableVehicles.filter((v: any) => {
            const vehicleOrgId = typeof v.organizationId === 'object'
                ? v.organizationId._id
                : v.organizationId;
            return vehicleOrgId === modalOrgFilter;
        });
    }, [availableVehicles, modalOrgFilter]);

    const selectedVehicle = useMemo(
        () => vehiclesByModalOrg.find((v: any) => v._id === formData.vehicleId) || null,
        [vehiclesByModalOrg, formData.vehicleId],
    );

    // 🔐 Filter devices to only show those in the SAME organization as selected vehicle
    const devicesBySelectedVehicleOrg = useMemo(() => {
        if (!selectedVehicle) return availableDevices;
        
        const vehicleOrgId = typeof selectedVehicle.organizationId === 'object' 
            ? selectedVehicle.organizationId._id 
            : selectedVehicle.organizationId;
        
        return availableDevices.filter((d: any) => {
            const deviceOrgId = typeof d.organizationId === 'object'
                ? d.organizationId._id
                : d.organizationId;
            return deviceOrgId === vehicleOrgId;
        });
    }, [selectedVehicle, availableDevices]);

    const selectedDevice = useMemo(
        () => devicesBySelectedVehicleOrg.find((d: any) => d._id === formData.deviceId) || null,
        [devicesBySelectedVehicleOrg, formData.deviceId],
    );

    const getMappedVehicle = (row: any) => {
        const vehicle = row.vehicleId;
        if (vehicle && typeof vehicle === "object") return vehicle;
        return vehicles.find((item: any) => item._id === vehicle) || null;
    };

    const getMappedDevice = (row: any) => {
        const device = row.gpsDeviceId;
        if (device && typeof device === "object") return device;
        return devices.find((item: any) => item._id === device) || null;
    };

    const getVehicleNumber = (row: any) => {
        const vehicle = getMappedVehicle(row);
        return vehicle?.vehicleNumber || "";
    };

    const getDeviceImei = (row: any) => {
        const device = getMappedDevice(row);
        return device?.imei || "";
    };

    const getOrganizationId = (row: any) => {
        const directOrg = row.organizationId;
        if (directOrg && typeof directOrg === "object") return directOrg._id || "";
        if (typeof directOrg === "string") return directOrg;

        const vehicleOrg = getMappedVehicle(row)?.organizationId;
        if (vehicleOrg && typeof vehicleOrg === "object") return vehicleOrg._id || "";
        if (typeof vehicleOrg === "string") return vehicleOrg;

        const deviceOrg = getMappedDevice(row)?.organizationId;
        if (deviceOrg && typeof deviceOrg === "object") return deviceOrg._id || "";
        if (typeof deviceOrg === "string") return deviceOrg;

        return "";
    };

    const getOrganizationName = (row: any) => {
        const directOrg = row.organizationId;
        if (directOrg && typeof directOrg === "object" && directOrg.name) return directOrg.name;

        const vehicleOrg = getMappedVehicle(row)?.organizationId;
        if (vehicleOrg && typeof vehicleOrg === "object" && vehicleOrg.name) return vehicleOrg.name;

        const deviceOrg = getMappedDevice(row)?.organizationId;
        if (deviceOrg && typeof deviceOrg === "object" && deviceOrg.name) return deviceOrg.name;

        const orgId = getOrganizationId(row);
        const org = organizations.find((item: any) => item._id === orgId);
        return org?.name || "N/A";
    };

    const getAssignedDate = (row: any) => {
        const date = row.createdAt || row.assignedAt;
        return date ? new Date(date).toISOString().split("T")[0] : "";
    };

    const filteredMappings = useMemo(() => {
        let filtered = mappings;

        if (filters.vehicleNumber) {
            filtered = filtered.filter((row: any) =>
                getVehicleNumber(row)
                    .toLowerCase()
                    .includes(filters.vehicleNumber.toLowerCase()),
            );
        }

        if (filters.imei) {
            filtered = filtered.filter((row: any) =>
                getDeviceImei(row)
                    .toLowerCase()
                    .includes(filters.imei.toLowerCase()),
            );
        }

        if (filters.organizationId) {
            filtered = filtered.filter(
                (row: any) => getOrganizationId(row) === filters.organizationId,
            );
        }

        if (filters.assignedDate) {
            filtered = filtered.filter(
                (row: any) => getAssignedDate(row) === filters.assignedDate,
            );
        }

        return filtered;
    }, [mappings, filters, vehicles, devices, organizations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleId || !formData.deviceId) {
            toast.error("Select both vehicle and device");
            return;
        }

        try {
            await assignDevice({
                vehicleId: formData.vehicleId,
                gpsDeviceId: formData.deviceId
            }).unwrap();
            toast.success("Device assigned successfully");
            closeModal();
        } catch (err: any) {
            toast.error(err?.data?.message || "Assignment failed");
        }
    };

    const handleUnassign = async (id: string) => {
        if (!canUnassign) {
            toast.error("You do not have permission to unassign devices.");
            return;
        }
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
        setModalOrgFilter(""); // 🔐 Reset org filter when opening modal
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setModalOrgFilter(""); // 🔐 Reset org filter when closing modal
    };

    const clearFilters = () => {
        setFilters({
            vehicleNumber: "",
            imei: "",
            organizationId: "",
            assignedDate: "",
        });
    };

    const columns = [
        {
            header: "Vehicle",
            accessor: (row: any) => getVehicleNumber(row) || "Unknown",
        },
        {
            header: "Organization",
            accessor: (row: any) => getOrganizationName(row),
        },
        {
            header: "Device IMEI",
            accessor: (row: any) => getDeviceImei(row) || "Unknown",
        },
        {
            header: "Assigned Date",
            accessor: (row: any) => {
                const date = row.createdAt || row.assignedAt;
                return date ? new Date(date).toLocaleDateString() : "-";
            },
        },
        {
            header: "Actions", accessor: (row: any) => (
                <button
                    onClick={() => handleUnassign(row._id)}
                    disabled={!canUnassign || isUnassigning}
                    className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                    <Trash2 size={14} /> Unassign
                </button>
            )
        }
    ];

    const isLoading = isMappingLoading || isVehLoading || isDevLoading || isOrgLoading;

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
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-200"
                        >
                            <span className="inline-flex items-center gap-2"><Filter size={16} /> Filters</span>
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60"
                            disabled={!canAssign}
                        >
                            <span className="inline-flex items-center gap-2"><Link2 size={16} /> Assign Device</span>
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Vehicle Number
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.vehicleNumber}
                                    onChange={(e) => setFilters({ ...filters, vehicleNumber: e.target.value })}
                                    placeholder="Search vehicle"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Device IMEI
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.imei}
                                    onChange={(e) => setFilters({ ...filters, imei: e.target.value })}
                                    placeholder="Search IMEI"
                                />
                            </div>
                            {/* 🔐 ORG CONTEXT UPDATE */}
                            {isSuperAdmin && (
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                        Organization
                                    </label>
                                    <select
                                        className="admin-select-readable w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={filters.organizationId}
                                        onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
                                    >
                                        <option value="">All Organizations</option>
                                        {organizations.map((org: any) => (
                                            <option key={org._id} value={org._id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Assigned Date
                                </label>
                                <input
                                    type="date"
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.assignedDate}
                                    onChange={(e) => setFilters({ ...filters, assignedDate: e.target.value })}
                                />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-4">
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

                <Table columns={columns} data={filteredMappings} loading={isLoading} />

                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
                        <div className="mapping-modal w-full max-w-3xl rounded-[32px] border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.25)] overflow-hidden">
                            <div className="px-8 py-7 border-b border-slate-100 flex items-start justify-between">
                                <div>
                                    <h2 className="text-[40px] leading-[1.02] font-black text-slate-900 tracking-tight">Establish New Link</h2>
                                    <p className="mt-1 text-sm text-slate-500">Select assets below to create a real-time tracking association.</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="mt-1 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="px-8 py-8">
                                {/* 🔐 Optional organization filter for superadmin/root admin */}
                                {canFilterOrg && organizations.length > 0 && (
                                    <div className="mb-6">
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                            <span className="inline-flex items-center gap-2">
                                                <Briefcase size={12} className="text-indigo-500" /> Filter by Organization
                                            </span>
                                        </label>
                                        <select
                                            className="admin-select-readable w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={modalOrgFilter}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                setModalOrgFilter(value);
                                                // Reset selections when organization filter changes
                                                setFormData({ vehicleId: "", deviceId: "" });
                                            }}
                                        >
                                            <option value="">All organizations (scoped)</option>
                                            {organizations.map((org: any) => (
                                                <option key={org._id} value={org._id}>
                                                    {org.orgPath ? `${org.orgPath} / ${org.name}` : org.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-11 gap-5 items-end">
                                    <div className="md:col-span-5">
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                            <span className="inline-flex items-center gap-2"><Car size={12} className="text-blue-500" /> Select Vehicle</span>
                                        </label>
                                        <select
                                            required
                                            className="admin-select-readable w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.vehicleId}
                                            onChange={(e) => setFormData({ vehicleId: e.target.value, deviceId: "" })}
                                        >
                                            <option value="">Search vehicle plate...</option>
                                          {vehiclesByModalOrg.map((v: any) => (
                                                <option key={v._id} value={v._id}>
                                                    {v.vehicleNumber} {v.model ? `(${v.model})` : ""}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="md:col-span-1 flex items-center justify-center pb-1">
                                        <div className="h-10 w-10 rounded-full border border-slate-200 bg-slate-50 text-slate-300 flex items-center justify-center">
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>

                                    <div className="md:col-span-5">
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                            <span className="inline-flex items-center gap-2"><Cpu size={12} className="text-indigo-500" /> Select Device</span>
                                        </label>
                                        <select
                                            required
                                            className="admin-select-readable w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.deviceId}
                                            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                            disabled={!selectedVehicle}
                                        >
                                            <option value="">Search device IMEI...</option>
                                            {devicesBySelectedVehicleOrg.map((d: any) => (
                                                <option key={d._id} value={d._id}>
                                                    {d.imei}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="h-10 rounded-full border border-dashed border-slate-200 bg-slate-50/60 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 flex items-center justify-center gap-2">
                                        <Info size={14} /> {selectedVehicle ? selectedVehicle.vehicleNumber : "Select Vehicle"}
                                    </div>
                                    <div className="h-10 rounded-full border border-dashed border-slate-200 bg-slate-50/60 px-4 text-[11px] font-black uppercase tracking-[0.16em] text-slate-900 flex items-center justify-center gap-2">
                                        <Info size={14} /> {selectedDevice ? selectedDevice.imei : "Select Device"}
                                    </div>
                                </div>

                                {(availableVehicles.length === 0 || (selectedVehicle && devicesBySelectedVehicleOrg.length === 0)) && (
                                    <div className="mt-4 text-[11px] font-semibold text-rose-500">
                                        {availableVehicles.length === 0 ? "No available vehicles found. " : ""}
                                        {selectedVehicle && devicesBySelectedVehicleOrg.length === 0 ? "No available devices found in this vehicle's organization." : ""}
                                    </div>
                                )}

                                <div className="mt-9 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Cancel Request
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!canAssign || !formData.vehicleId || !formData.deviceId || isAssigning}
                                        className="min-w-[245px] h-10 rounded-2xl bg-slate-300 px-6 text-[11px] font-black uppercase tracking-[0.14em] text-white disabled:opacity-100 disabled:cursor-not-allowed enabled:bg-slate-900 enabled:hover:bg-black transition-colors"
                                    >
                                        {isAssigning ? "Processing..." : "Confirm Mapping Connection"}
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
