"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    useGetOrganizationsQuery,
    useCreateOrganizationMutation,
    useCreateSubOrganizationMutation,
    useUpdateOrganizationMutation,
    useDeleteOrganizationMutation
} from "@/redux/api/organizationApi";

import Validator from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export interface Organization {
    _id: string;
    name: string;
    organizationType: "logistics" | "transport" | "school" | "taxi" | "fleet";
    email: string;
    phone: string;
    logo?: string;
    address?: {
        addressLine?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
    };
    parentOrganizationId: string | null;
    status: "active" | "inactive";
    createdAt: string;
}

export default function OrganizationsPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();

    // API Hooks
    const { data: apiResponse, isLoading, error: apiError } = useGetOrganizationsQuery(undefined);
    const [createOrganization, { isLoading: isCreating }] = useCreateOrganizationMutation();
    const [createSubOrganization, { isLoading: isCreatingSub }] = useCreateSubOrganizationMutation();
    const [updateOrganization, { isLoading: isUpdating }] = useUpdateOrganizationMutation();
    const [deleteOrganization, { isLoading: isDeleting }] = useDeleteOrganizationMutation();

    const organizations = (apiResponse?.data as Organization[]) || [];
    const rootOrg = organizations.find(o => !o.parentOrganizationId);
    const hasRootOrg = !!rootOrg;

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        name: "",
        status: "",
        type: ""
    });
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        organizationType: "logistics",
        email: "",
        phone: "",
        address: "",
        status: "active" as "active" | "inactive"
    });
    const [errors, setErrors] = useState<any>({});

    const Rules = {
        name: { required: true, type: "string" as const, errorMessage: "Name is required." },
        email: { required: true, type: "string" as const, errorMessage: "Email is required." },
        phone: { required: true, type: "string" as const, errorMessage: "Phone is required." }
    };

    const validator = new Validator(Rules);

    const handleBlur = async (name: string, value: any) => {
        const validationErrors = await validator.validateFormField(name, value);
        setErrors((prev: any) => ({
            ...prev,
            [name]: validationErrors[name]
        }));
    };

    const filteredOrganizations = useMemo(() => {
        let filtered = organizations;

        if (filters.name) {
            filtered = filtered.filter(org =>
                org.name.toLowerCase().includes(filters.name.toLowerCase())
            );
        }

        if (filters.status) {
            filtered = filtered.filter(org => org.status === filters.status);
        }

        if (filters.type === "main") {
            filtered = filtered.filter(org => !org.parentOrganizationId);
        } else if (filters.type === "sub") {
            filtered = filtered.filter(org => org.parentOrganizationId);
        }

        return filtered;
    }, [organizations, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = await validator.validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        // Map address string to object as expected by backend
        const payload = {
            ...formData,
            address: { addressLine: formData.address },
        };

        try {
            if (editingOrg) {
                await updateOrganization({ id: editingOrg._id, ...payload }).unwrap();
                toast.success("Organization updated successfully");
            } else {
                if (hasRootOrg) {
                    await createSubOrganization({
                        ...payload,
                        parentOrganizationId: rootOrg._id
                    }).unwrap();
                    toast.success("Sub-organization created successfully");
                } else {
                    await createOrganization(payload).unwrap();
                    toast.success("Main organization created successfully");
                }
            }
            closeModal();
        } catch (err: any) {
            console.error(err);
            toast.error(err?.data?.message || "Operation failed");
        }
    };

    const openCreateModal = () => {
        setEditingOrg(null);
        setFormData({ name: "", organizationType: "logistics", email: "", phone: "", address: "", status: "active" });
        setErrors({});
        openPopup("orgModal");
    };

    const openEditModal = (org: Organization) => {
        setEditingOrg(org);
        setFormData({
            name: org.name,
            organizationType: (org.organizationType as any) || "logistics",
            email: org.email,
            phone: org.phone,
            address: org.address?.addressLine || "",
            status: org.status
        });
        setErrors({});
        openPopup("orgModal");
    };

    const closeModal = () => {
        closePopup("orgModal");
        setEditingOrg(null);
    };

    const handleDelete = async (id: string) => {
        const org = organizations.find(o => o._id === id);
        if (org && !org.parentOrganizationId) {
            toast.error("Cannot delete the main organization");
            return;
        }
        if (confirm("Are you sure you want to delete this organization?")) {
            try {
                await deleteOrganization(id).unwrap();
                toast.success("Organization deleted");
            } catch (err: any) {
                toast.error(err?.data?.message || "Delete failed");
            }
        }
    }

    const clearFilters = () => {
        setFilters({ name: "", status: "", type: "" });
    };

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Type", accessor: "organizationType", render: (value: string) => capitalizeFirstLetter(value) },
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                >
                    {capitalizeFirstLetter(row.status)}
                </span>
            )
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    {!isLoading && !isDeleting && (
                        <button onClick={() => handleDelete(row._id)} className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                    )}
                </div>
            )
        }
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-slate-500" size={32} />
            </div>
        )
    }

    if (apiError) {
        return (
            <div className="p-4 text-red-500">
                Error loading organizations.
            </div>
        )
    }

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Organizations</h1>
                        <p className="text-sm text-slate-500">Manage your client organizations here.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
                        >
                            <Filter size={16} /> Filter Organizations
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            <Plus size={16} /> {hasRootOrg ? "Add Sub-Organization" : "Add Main Organization"}
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Organization Name</label>
                                <input
                                    type="text"
                                    placeholder="Search by name..."
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                    value={filters.name}
                                    onChange={e => setFilters({ ...filters, name: e.target.value })}
                                />
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
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Type</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                    value={filters.type}
                                    onChange={e => setFilters({ ...filters, type: e.target.value })}
                                >
                                    <option value="">All Types</option>
                                    <option value="main">Main Organization</option>
                                    <option value="sub">Sub-Organization</option>
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

                <Table columns={columns} data={filteredOrganizations} loading={isLoading} />

                {isPopupOpen("orgModal") && (
                    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
                            <h2 className="text-xl font-bold mb-4">{editingOrg ? "Edit Organization" : (hasRootOrg ? "New Sub-Organization" : "New Main Organization")}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Name</label>
                                    <input type="text" className={`w-full border ${errors.name ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        onBlur={e => handleBlur("name", e.target.value)}
                                    />
                                    {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Type</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                        value={formData.organizationType}
                                        onChange={e => setFormData({ ...formData, organizationType: e.target.value })}
                                    >
                                        <option value="logistics">Logistics</option>
                                        <option value="transport">Transport</option>
                                        <option value="school">School</option>
                                        <option value="taxi">Taxi</option>
                                        <option value="fleet">Fleet</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Email</label>
                                    <input type="email" className={`w-full border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        onBlur={e => handleBlur("email", e.target.value)}
                                    />
                                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Phone</label>
                                    <input type="text" className={`w-full border ${errors.phone ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        onBlur={e => handleBlur("phone", e.target.value)}
                                    />
                                    {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.phone}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Address</label>
                                    <textarea className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                        value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</label>
                                    <select className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                                        value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200">Cancel</button>
                                    <button type="submit" disabled={isCreating || isCreatingSub || isUpdating} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50">
                                        {(isCreating || isCreatingSub || isUpdating) ? "Saving..." : "Save"}
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
