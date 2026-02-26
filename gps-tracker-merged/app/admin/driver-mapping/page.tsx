"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Trash2, Loader2, UserPlus, Filter, Car, User, ArrowRight, X, Info } from "lucide-react";
import { toast } from "sonner";
import {
    useGetVehicleDriverMappingsQuery,
    useAssignDriverMutation,
    useUnassignDriverMutation
} from "@/redux/api/vehicleDriverMappingApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";
import { useGetDriversQuery } from "@/redux/api/driversApi";
import { useGetGpsDevicesQuery } from "@/redux/api/gpsDeviceApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";

export default function DriverMappingPage() {
    // API Hooks
    const { data: mappingData, isLoading: isMappingLoading } = useGetVehicleDriverMappingsQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });
    const { data: driverData, isLoading: isDriverLoading } = useGetDriversQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });
    const { data: gpsData, isLoading: isGpsLoading } = useGetGpsDevicesQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });
    const { data: orgData, isLoading: isOrgLoading } = useGetOrganizationsQuery(undefined, { refetchOnMountOrArgChange: true });

    // Mutations
    const [assignDriver, { isLoading: isAssigning }] = useAssignDriverMutation();
    const [unassignDriver, { isLoading: isUnassigning }] = useUnassignDriverMutation();

    const mappings = Array.isArray(mappingData?.data) ? mappingData.data : [];
    const vehicles = Array.isArray(vehData?.data) ? vehData.data : [];
    const drivers = Array.isArray(driverData?.data) ? driverData.data : [];
    const gpsDevices = Array.isArray(gpsData?.data) ? gpsData.data : [];
    const organizations = useMemo(() => (orgData?.data as any[]) || [], [orgData]);
    const userRole = getSecureItem("userRole");
    const canAssign = userRole === "admin";
    const canUnassign = userRole === "admin";

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [formData, setFormData] = useState({ vehicleId: "", driverId: "" });
    const [filters, setFilters] = useState({
        vehicleNumber: "",
        driverName: "",
        driverPhone: "",
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
    const assignedDriverIds = new Set(
        mappings.map((m: any) => getEntityId(m.driverId)).filter(Boolean),
    );

    const availableVehicles = useMemo(
        () => vehicles.filter((v: any) =>
            !assignedVehicleIds.has(v._id?.toString()) && v.deviceId
        ),
        [vehicles, assignedVehicleIds],
    );
    const availableDrivers = useMemo(
        () => drivers.filter((d: any) => !assignedDriverIds.has(d._id?.toString())),
        [drivers, assignedDriverIds],
    );

    const selectedVehicle = useMemo(
        () => availableVehicles.find((v: any) => v._id === formData.vehicleId) || null,
        [availableVehicles, formData.vehicleId],
    );
    const selectedDriver = useMemo(
        () => availableDrivers.find((d: any) => d._id === formData.driverId) || null,
        [availableDrivers, formData.driverId],
    );

    const getMappedVehicle = (row: any) => {
        const vehicle = row.vehicleId;
        if (vehicle && typeof vehicle === "object") return vehicle;
        return vehicles.find((item: any) => item._id === vehicle) || null;
    };

    const getMappedDriver = (row: any) => {
        const driver = row.driverId;
        if (driver && typeof driver === "object") return driver;
        return drivers.find((item: any) => item._id === driver) || null;
    };

    const getMappedDevice = (row: any) => {
        const directDevice = row.deviceId;
        if (directDevice && typeof directDevice === "object") return directDevice;
        if (typeof directDevice === "string") {
            const foundDirect = gpsDevices.find((item: any) => item._id === directDevice);
            if (foundDirect) return foundDirect;
        }

        const vehicle = getMappedVehicle(row);
        const vehicleDevice = vehicle?.deviceId;
        if (vehicleDevice && typeof vehicleDevice === "object") return vehicleDevice;
        return gpsDevices.find((item: any) => item._id === vehicleDevice) || null;
    };

    const getVehicleNumber = (row: any) => getMappedVehicle(row)?.vehicleNumber || "";
    const getVehicleImei = (row: any) => getMappedDevice(row)?.imei || "";

    const getDriverName = (row: any) => {
        const driver = getMappedDriver(row);
        if (!driver) return "";
        return `${driver.firstName || ""} ${driver.lastName || ""}`.trim();
    };

    const getDriverPhone = (row: any) => getMappedDriver(row)?.phone || "";

    const getOrganizationId = (row: any) => {
        const directOrg = row.organizationId;
        if (directOrg && typeof directOrg === "object") return directOrg._id || "";
        if (typeof directOrg === "string") return directOrg;

        const vehicleOrg = getMappedVehicle(row)?.organizationId;
        if (vehicleOrg && typeof vehicleOrg === "object") return vehicleOrg._id || "";
        if (typeof vehicleOrg === "string") return vehicleOrg;

        const driverOrg = getMappedDriver(row)?.organizationId;
        if (driverOrg && typeof driverOrg === "object") return driverOrg._id || "";
        if (typeof driverOrg === "string") return driverOrg;

        return "";
    };

    const getOrganizationName = (row: any) => {
        const directOrg = row.organizationId;
        if (directOrg && typeof directOrg === "object" && directOrg.name) return directOrg.name;

        const vehicleOrg = getMappedVehicle(row)?.organizationId;
        if (vehicleOrg && typeof vehicleOrg === "object" && vehicleOrg.name) return vehicleOrg.name;

        const driverOrg = getMappedDriver(row)?.organizationId;
        if (driverOrg && typeof driverOrg === "object" && driverOrg.name) return driverOrg.name;

        const orgId = getOrganizationId(row);
        const org = organizations.find((item: any) => item._id === orgId);
        return org?.name || "N/A";
    };

    const getAssignedDate = (row: any) => {
        const date = row.assignedAt || row.createdAt;
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

        if (filters.driverName) {
            filtered = filtered.filter((row: any) =>
                getDriverName(row)
                    .toLowerCase()
                    .includes(filters.driverName.toLowerCase()),
            );
        }

        if (filters.driverPhone) {
            filtered = filtered.filter((row: any) =>
                getDriverPhone(row)
                    .toLowerCase()
                    .includes(filters.driverPhone.toLowerCase()),
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
    }, [mappings, filters, vehicles, drivers, organizations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.vehicleId || !formData.driverId) {
            toast.error("Select both vehicle and driver");
            return;
        }

        try {
            await assignDriver({
                vehicleId: formData.vehicleId,
                driverId: formData.driverId
            }).unwrap();
            toast.success("Driver assigned successfully");
            closeModal();
        } catch (err: any) {
            toast.error(err?.data?.message || "Assignment failed");
        }
    };

    const handleUnassign = async (vehicleId: string) => {
        if (!canUnassign) {
            toast.error("You do not have permission to unassign drivers.");
            return;
        }
        if (confirm("Are you sure you want to unassign this driver?")) {
            try {
                await unassignDriver({ vehicleId }).unwrap();
                toast.success("Driver unassigned");
            } catch (err: any) {
                toast.error(err?.data?.message || "Unassignment failed");
            }
        }
    }

    const openCreateModal = () => {
        setFormData({ vehicleId: "", driverId: "" });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const clearFilters = () => {
        setFilters({
            vehicleNumber: "",
            driverName: "",
            driverPhone: "",
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
            header: "IMEI",
            accessor: (row: any) => getVehicleImei(row) || "N/A",
        },
        {
            header: "Driver",
            accessor: (row: any) => getDriverName(row) || "Unknown",
        },
        {
            header: "Organization",
            accessor: (row: any) => getOrganizationName(row),
        },
        {
            header: "Assigned Date",
            accessor: (row: any) => {
                const date = row.assignedAt || row.createdAt;
                return date ? new Date(date).toLocaleDateString() : "-";
            },
        },
        {
            header: "Actions", accessor: (row: any) => (
                <button
                    onClick={() => handleUnassign(row.vehicleId?._id || row.vehicleId)}
                    disabled={!canUnassign || isUnassigning}
                    className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 disabled:opacity-50"
                >
                    <Trash2 size={14} /> Unassign
                </button>
            )
        }
    ];

    const isLoading = isMappingLoading || isVehLoading || isDriverLoading || isGpsLoading || isOrgLoading;

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
                        <h1 className="text-2xl font-black text-slate-900">Driver Mapping</h1>
                        <p className="text-sm text-slate-500">Associate active drivers with fleet vehicles.</p>
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
                            <span className="inline-flex items-center gap-2"><UserPlus size={16} /> Assign Driver</span>
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
                                    Driver Name
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.driverName}
                                    onChange={(e) => setFilters({ ...filters, driverName: e.target.value })}
                                    placeholder="Search driver"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Driver Phone
                                </label>
                                <input
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.driverPhone}
                                    onChange={(e) => setFilters({ ...filters, driverPhone: e.target.value })}
                                    placeholder="Search phone"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Organization
                                </label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.organizationId}
                                    onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
                                >
                                    <option value="">All Organizations</option>
                                    {organizations.map((org: any) => (
                                        <option key={org._id} value={org._id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>
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
                            <div className="sm:col-span-2 lg:col-span-3 flex items-end">
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
                                <div className="grid grid-cols-1 md:grid-cols-11 gap-5 items-end">
                                    <div className="md:col-span-5">
                                        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">
                                            <span className="inline-flex items-center gap-2"><Car size={12} className="text-blue-500" /> Select Vehicle</span>
                                        </label>
                                        <select
                                            required
                                            className="admin-select-readable w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.vehicleId}
                                            onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                                        >
                                            <option value="">Search vehicle plate...</option>
                                            {availableVehicles.map((v: any) => (
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
                                            <span className="inline-flex items-center gap-2"><User size={12} className="text-indigo-500" /> Select Driver</span>
                                        </label>
                                        <select
                                            required
                                            className="admin-select-readable w-full h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={formData.driverId}
                                            onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                                        >
                                            <option value="">Search driver name...</option>
                                            {availableDrivers.map((d: any) => (
                                                <option key={d._id} value={d._id}>
                                                    {d.firstName} {d.lastName}
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
                                        <Info size={14} /> {selectedDriver ? `${selectedDriver.firstName} ${selectedDriver.lastName}` : "Select Driver"}
                                    </div>
                                </div>

                                {(availableVehicles.length === 0 || availableDrivers.length === 0) && (
                                    <div className="mt-4 text-[11px] font-semibold text-rose-500">
                                        {availableVehicles.length === 0 ? "No available vehicles found. Vehicles must have a GPS device assigned first. " : ""}
                                        {availableDrivers.length === 0 ? "No available drivers found." : ""}
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
                                        disabled={!canAssign || !formData.vehicleId || !formData.driverId || isAssigning}
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
