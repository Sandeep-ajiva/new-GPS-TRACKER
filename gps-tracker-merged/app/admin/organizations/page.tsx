"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { getOrganizations, getRootOrganization, setOrganizations, type Organization } from "@/lib/admin-dummy-data";

import { validators, validateForm } from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export default function OrganizationsPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();
    const [organizations, setOrganizationsState] = useState(getOrganizations());
    const rootOrg = getRootOrganization();
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
        email: "",
        phone: "",
        address: "",
        status: "active" as "active" | "inactive"
    });
    const [errors, setErrors] = useState<any>({});

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
            filtered = filtered.filter(org => !org.parentId);
        } else if (filters.type === "sub") {
            filtered = filtered.filter(org => org.parentId);
        }

        return filtered;
    }, [organizations, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use validators
        const validationRules = {
            name: [validators.required],
            email: [validators.required, validators.email],
            phone: [validators.required]
        };

        const { isValid, errors: validationErrors } = validateForm(formData, validationRules);

        if (!isValid) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        if (editingOrg) {
            const updated = organizations.map((org) =>
                org._id === editingOrg._id ? { ...org, ...formData } : org
            );
            setOrganizationsState(updated);
            setOrganizations(updated);
            toast.success("Organization updated successfully");
        } else {
            // Only allow sub-organizations if root org exists
            if (!hasRootOrg) {
                toast.error("Please create the main organization first");
                return;
            }
            const newOrg: Organization = {
                _id: `org_${Date.now()}`,
                status: formData.status,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                parentId: rootOrg?._id || null,
                createdAt: new Date().toISOString(),
            };
            const updated = [...organizations, newOrg];
            setOrganizationsState(updated);
            setOrganizations(updated);
            toast.success("Sub-organization created successfully");
        }
        closeModal();
    };

    const openCreateModal = () => {
        if (!hasRootOrg) {
            toast.error("Main organization must be created first");
            return;
        }
        setEditingOrg(null);
        setFormData({ name: "", email: "", phone: "", address: "", status: "active" });
        setErrors({});
        openPopup("orgModal");
    };

    const openEditModal = (org: any) => {
        setEditingOrg(org);
        setFormData({
            name: org.name,
            email: org.email,
            phone: org.phone,
            address: org.address || "",
            status: org.status || "active"
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
        if (org && !org.parentId) {
            toast.error("Cannot delete the main organization");
            return;
        }
        if (confirm("Are you sure you want to delete this organization?")) {
            const updated = organizations.filter((org) => org._id !== id);
            setOrganizationsState(updated);
            setOrganizations(updated);
            toast.success("Organization deleted");
        }
    }

    const clearFilters = () => {
        setFilters({ name: "", status: "", type: "" });
    };

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {capitalizeFirstLetter(row.status)}
                </span>
            )
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
                            <Plus size={16} /> Add Sub-Organization
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

                <Table columns={columns} data={filteredOrganizations} loading={false} />

                {isPopupOpen("orgModal") && (
                    <div className="fixed inset-0 bg-slate-950/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-slate-200">
                            <h2 className="text-xl font-bold mb-4">{editingOrg ? "Edit Sub-Organization" : "New Sub-Organization"}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Name</label>
                                    <input type="text" className={`w-full border ${errors.name ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Email</label>
                                    <input type="email" className={`w-full border ${errors.email ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Phone</label>
                                    <input type="text" className={`w-full border ${errors.phone ? 'border-red-500' : 'border-slate-200'} rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none`}
                                        value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
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
                                    <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800">Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </ApiErrorBoundary>
    );
}
