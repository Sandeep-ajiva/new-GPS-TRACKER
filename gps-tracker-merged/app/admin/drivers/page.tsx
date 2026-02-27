"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2, User, Phone, Mail, IdCard, Calendar, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
    useGetDriversQuery,
    useCreateDriverWithUserMutation,
    useUpdateDriverMutation,
    useDeleteDriverMutation,
} from "@/redux/api/driversApi";

import { useGetOrganizationsQuery, useGetSubOrganizationsQuery } from "@/redux/api/organizationApi";
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi";

import { usePopups } from "@/app/admin/Helpers/PopupContext";
import { capitalizeFirstLetter } from "@/app/admin/Helpers/CapitalizeFirstLetter";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";
import ImportExportButton from "@/components/admin/import-export/ImportExportButton";

export default function DriversPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();

    const [showFilters, setShowFilters] = useState(false);
    const userRole = getSecureItem("userRole");
    const canCreateDriver = userRole === "admin" || userRole === "superadmin";
    const canEditDriver = userRole === "admin" || userRole === "superadmin";
    const canDeleteDriver = userRole === "superadmin";

    const [filters, setFilters] = useState({
        name: "",
        phone: "",
        licenseNumber: "",
        vehicleNumber: "",
        status: "",
        organizationId: "",
    });

    const [editingDriver, setEditingDriver] = useState<any>(null);

    // API Hooks
    const { data: driversData, isLoading: isDriversLoading, refetch: refetchDrivers } = useGetDriversQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: orgData, isLoading: isOrgLoading } = useGetOrganizationsQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: subOrgData, isLoading: isSubOrgLoading } = useGetSubOrganizationsQuery(undefined, { refetchOnMountOrArgChange: true });
    const { data: vehData, isLoading: isVehLoading } = useGetVehiclesQuery(undefined, { refetchOnMountOrArgChange: true });

    const [createDriver, { isLoading: isCreating }] = useCreateDriverWithUserMutation();
    const [updateDriver, { isLoading: isUpdating }] = useUpdateDriverMutation();
    const [deleteDriver, { isLoading: isDeleting }] = useDeleteDriverMutation();

    const drivers = useMemo(() => (driversData?.data as any[]) || [], [driversData]);
    const organizations = useMemo(() => {
        const rootOrgs = (orgData?.data as any[]) || [];
        const subOrgs = (subOrgData?.data as any[]) || [];
        const merged = new Map<string, any>();
        [...rootOrgs, ...subOrgs].forEach((org: any) => {
            if (org?._id) merged.set(org._id, org);
        });
        return Array.from(merged.values());
    }, [orgData, subOrgData]);
    const vehicles = useMemo(() => (vehData?.data as any[]) || [], [vehData]);

    const filteredDrivers = useMemo(() => {
        let filtered = drivers;

        if (filters.name) {
            filtered = filtered.filter((d) =>
                `${d.firstName || ""} ${d.lastName || ""}`
                    .toLowerCase()
                    .includes(filters.name.toLowerCase()),
            );
        }

        if (filters.phone) {
            filtered = filtered.filter((d) =>
                (d.phone || "").toLowerCase().includes(filters.phone.toLowerCase()),
            );
        }

        if (filters.licenseNumber) {
            filtered = filtered.filter((d) =>
                (d.licenseNumber || "")
                    .toLowerCase()
                    .includes(filters.licenseNumber.toLowerCase()),
            );
        }

        if (filters.vehicleNumber) {
            filtered = filtered.filter((d) => {
                const assigned = d.assignedVehicleId;
                if (!assigned) return false;
                if (typeof assigned === "object") {
                    return (assigned.vehicleNumber || "")
                        .toLowerCase()
                        .includes(filters.vehicleNumber.toLowerCase());
                }
                const vehicle = vehicles.find((item: any) => item._id === assigned);
                return (vehicle?.vehicleNumber || "")
                    .toLowerCase()
                    .includes(filters.vehicleNumber.toLowerCase());
            });
        }

        if (filters.status) {
            filtered = filtered.filter((d) => d.status === filters.status);
        }
        if (filters.organizationId) {
            filtered = filtered.filter((d) => {
                const id = typeof d.organizationId === 'object' ? d.organizationId._id : d.organizationId;
                return id === filters.organizationId;
            });
        }
        return filtered;
    }, [drivers, vehicles, filters.name, filters.phone, filters.licenseNumber, filters.vehicleNumber, filters.status, filters.organizationId]);

    const handleSubmit = async (data: Record<string, string | number | boolean | File>) => {
        try {
            const payload: any = { ...data };
            // Vehicle assignment is managed only from Driver Mapping page for now.
            delete payload.assignedVehicleId;

            if (editingDriver) {
                // Exclude passwordHash on update
                delete payload.passwordHash;
                await updateDriver({ id: editingDriver._id, ...payload }).unwrap();
                toast.success("Driver updated successfully");
            } else {
                await createDriver(payload).unwrap();
                toast.success("Driver and user created successfully");
            }
            closeModal();
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || "Operation failed");
            throw err;
        }
    };

    const driverFormFields: FormField[] = useMemo(() => [
        {
            name: "firstName",
            label: "First Name",
            type: "text",
            required: true,
            placeholder: "John",
            icon: <User size={14} className="text-slate-500" />,
        },
        {
            name: "lastName",
            label: "Last Name",
            type: "text",
            required: true,
            placeholder: "Doe",
            icon: <User size={14} className="text-slate-500" />,
        },
        {
            name: "email",
            label: "Email Address",
            type: "email",
            required: true,
            placeholder: "driver@example.com",
            icon: <Mail size={14} className="text-slate-500" />,
        },
        {
            name: "phone",
            label: "Phone Number",
            type: "tel",
            required: true,
            placeholder: "+1 234 567 890",
            icon: <Phone size={14} className="text-slate-500" />,
        },
        {
            name: "licenseNumber",
            label: "License Number",
            type: "text",
            required: true,
            placeholder: "DL12345678",
            icon: <IdCard size={14} className="text-slate-500" />,
        },
        {
            name: "licenseExpiry",
            label: "License Expiry",
            type: "date",
            icon: <Calendar size={14} className="text-slate-500" />,
        },
        // Password only on creation
        ...(!editingDriver
            ? [
                {
                    name: "passwordHash",
                    label: "Password",
                    type: "password" as const,
                    required: true,
                    placeholder: "********",
                    icon: <CheckCircle size={14} className="text-slate-500" />,
                },
            ]
            : []),
        {
            name: "organizationId",
            label: "Organization",
            type: "select",
            required: true,
            options: organizations.map((org) => ({
                label: org.name,
                value: org._id,
            })),
            icon: <User size={14} className="text-slate-500" />,
        },
        {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
                { label: "Blocked", value: "blocked" },
            ],
            icon: <CheckCircle size={14} className="text-slate-500" />,
        },
    ], [editingDriver, organizations]);

    const openCreateModal = () => {
        setEditingDriver(null);
        openPopup("driverModal");
    };

    const openEditModal = (driver: any) => {
        setEditingDriver(driver);
        openPopup("driverModal");
    };

    const closeModal = () => {
        closePopup("driverModal");
        setEditingDriver(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this driver?")) {
            try {
                await deleteDriver(id).unwrap();
                toast.success("Driver deleted");
            } catch (err: any) {
                toast.error(err?.data?.message || "Delete failed");
            }
        }
    };

    const clearFilters = () => {
        setFilters({
            name: "",
            phone: "",
            licenseNumber: "",
            vehicleNumber: "",
            status: "",
            organizationId: "",
        });
    };

    const columns = [
        {
            header: "Name",
            accessor: (row: any) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                        {row.firstName[0]}{row.lastName[0]}
                    </div>
                    <div>
                        <div className="font-semibold text-slate-900">{row.firstName} {row.lastName}</div>
                        <div className="text-[10px] text-slate-500">{row.email}</div>
                    </div>
                </div>
            ),
        },
        {
            header: "Contact",
            accessor: (row: any) => (
                <div className="flex flex-col">
                    <span className="text-xs font-medium text-slate-700">{row.phone}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{row.licenseNumber}</span>
                </div>
            )
        },
        {
            header: "Organization",
            accessor: (row: any) => {
                if (typeof row.organizationId === "object" && row.organizationId?.name) {
                    return row.organizationId.name;
                }
                const orgId = typeof row.organizationId === 'object' ? row.organizationId?._id : row.organizationId;
                const org = organizations.find((o) => o._id === orgId);
                return org ? org.name : "N/A";
            },
        },
        {
            header: "Vehicle",
            accessor: (row: any) => {
                const vehicle = row.assignedVehicleId;
                if (!vehicle) return <span className="text-slate-400 text-xs font-medium italic">Unassigned</span>;
                if (typeof vehicle === 'object') return <span className="text-slate-700 text-xs font-bold">{vehicle.vehicleNumber}</span>;
                const v = vehicles.find((item: any) => item._id === vehicle);
                return <span className="text-slate-700 text-xs font-bold">{v?.vehicleNumber || "Unknown"}</span>;
            }
        },
        {
            header: "Status",
            accessor: (row: any) => (
                <span
                    className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === "active"
                            ? "bg-green-100 text-green-700"
                            : row.status === "blocked"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                        }`}
                >
                    {capitalizeFirstLetter(row.status || "active")}
                </span>
            ),
        },
        {
            header: "Actions",
            accessor: (row: any) => (
                <div className="flex gap-2">
                    {canEditDriver && (
                        <button
                            onClick={() => openEditModal(row)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                        >
                            <Edit size={16} />
                        </button>
                    )}
                    {canDeleteDriver && (
                        <button
                            onClick={() => handleDelete(row._id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            disabled={isDeleting}
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const isLoading = isDriversLoading || isOrgLoading || isSubOrgLoading || isVehLoading;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-slate-500" size={32} />
            </div>
        );
    }

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Drivers</h1>
                        <p className="text-sm text-slate-500">
                            Manage operators and driver profiles in your platform.
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                        <ImportExportButton
                            moduleName="drivers"
                            importUrl="/importexport/import/drivers"
                            exportUrl="/importexport/export/drivers"
                            allowedFields={[
                                "organizationId",
                                "firstName",
                                "lastName",
                                "email",
                                "phone",
                                "licenseNumber",
                                "licenseExpiry",
                                "status",
                            ]}
                            requiredFields={["organizationId", "firstName", "phone", "licenseNumber"]}
                            filters={{
                                name: filters.name,
                                phone: filters.phone,
                                licenseNumber: filters.licenseNumber,
                                status: filters.status,
                                organizationId: filters.organizationId,
                            }}
                            onCompleted={() => {
                                void refetchDrivers();
                            }}
                        />
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
                        >
                            <Filter size={16} /> Filtered Views
                        </button>
                        {canCreateDriver && (
                            <button
                                onClick={openCreateModal}
                                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                            >
                                <Plus size={16} /> Add Driver
                            </button>
                        )}
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Driver Name
                                </label>
                                <input
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={filters.name}
                                    onChange={(e) =>
                                        setFilters({ ...filters, name: e.target.value })
                                    }
                                    placeholder="Search name"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Phone
                                </label>
                                <input
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={filters.phone}
                                    onChange={(e) =>
                                        setFilters({ ...filters, phone: e.target.value })
                                    }
                                    placeholder="Search phone"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    License Number
                                </label>
                                <input
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={filters.licenseNumber}
                                    onChange={(e) =>
                                        setFilters({ ...filters, licenseNumber: e.target.value })
                                    }
                                    placeholder="Search license"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Vehicle Number
                                </label>
                                <input
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={filters.vehicleNumber}
                                    onChange={(e) =>
                                        setFilters({ ...filters, vehicleNumber: e.target.value })
                                    }
                                    placeholder="Search vehicle"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Status
                                </label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={filters.status}
                                    onChange={(e) =>
                                        setFilters({ ...filters, status: e.target.value })
                                    }
                                >
                                    <option value="">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="blocked">Blocked</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                                    Organization
                                </label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none"
                                    value={filters.organizationId}
                                    onChange={(e) =>
                                        setFilters({ ...filters, organizationId: e.target.value })
                                    }
                                >
                                    <option value="">All Organizations</option>
                                    {organizations.map((org: any) => (
                                        <option key={org._id} value={org._id}>{org.name}</option>
                                    ))}
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

                <Table columns={columns} data={filteredDrivers} loading={isLoading} />

                {canCreateDriver && (
                    <DynamicModal
                        isOpen={isPopupOpen("driverModal")}
                        onClose={closeModal}
                        title={editingDriver ? "Edit Driver" : "New Driver & User"}
                        description={editingDriver ? "Update driver information." : "Create a new driver and automatically generate their user account."}
                        fields={driverFormFields}
                        initialData={
                            editingDriver
                                ? {
                                    firstName: editingDriver.firstName,
                                    lastName: editingDriver.lastName,
                                    email: editingDriver.email,
                                    phone: editingDriver.phone,
                                    licenseNumber: editingDriver.licenseNumber,
                                    licenseExpiry: editingDriver.licenseExpiry
                                        ? new Date(editingDriver.licenseExpiry).toISOString().split('T')[0]
                                        : "",
                                    organizationId: typeof editingDriver.organizationId === 'object' ? editingDriver.organizationId._id : editingDriver.organizationId,
                                    status: editingDriver.status,
                                }
                                : undefined
                        }
                        onSubmit={handleSubmit}
                        submitLabel={editingDriver ? "Update Driver" : "Create Driver"}
                    />
                )}
            </div>
        </ApiErrorBoundary>
    );
}
