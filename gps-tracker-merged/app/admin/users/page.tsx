"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { getUsers, getOrganizations, setUsers, type User } from "@/lib/admin-dummy-data";

import { validators, validateForm } from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export default function UsersPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();
    const [users, setUsersState] = useState(getUsers());
    const [organizations] = useState(getOrganizations());
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        role: "",
        organizationId: ""
    });

    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "admin" as "admin" | "manager" | "driver" | "superadmin",
        organizationId: "",
        status: "active" as "active" | "inactive"
    });
    const [errors, setErrors] = useState<any>({});

    const filteredUsers = useMemo(() => {
        let filtered = users;
        if (filters.role) {
            filtered = filtered.filter(u => u.role === filters.role);
        }
        if (filters.organizationId) {
            filtered = filtered.filter(u => u.organizationId === filters.organizationId);
        }
        return filtered;
    }, [users, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use validators
        const validationRules = {
            name: [validators.required],
            email: [validators.required, validators.email],
            password: editingUser ? [] : [validators.required, validators.minLength(6)]
        };

        const { isValid, errors: validationErrors } = validateForm(formData, validationRules);

        if (!isValid) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        // Prevent SuperAdmin from being added
        if (formData.role === "superadmin") {
            toast.error("SuperAdmin role cannot be added");
            return;
        }

        if (editingUser) {
            const updated = users.map((user) =>
                user._id === editingUser._id
                    ? { ...user, ...formData, password: formData.password || user.password }
                    : user
            );
            setUsersState(updated);
            setUsers(updated);
            toast.success("User updated successfully");
        } else {
            const newUser: User = {
                _id: `user_${Date.now()}`,
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role,
                organizationId: formData.organizationId || null,
                status: formData.status,
            };
            const updated = [...users, newUser];
            setUsersState(updated);
            setUsers(updated);
            toast.success("User created successfully");
        }
        closeModal();
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "admin", organizationId: "", status: "active" });
        setErrors({});
        openPopup("userModal");
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: "", // Don't show password
            role: user.role,
            organizationId: user.organizationId?._id || user.organizationId || "",
            status: user.status || "active"
        });
        setErrors({});
        openPopup("userModal");
    };

    const closeModal = () => {
        closePopup("userModal");
        setEditingUser(null);
    };

    const handleDelete = async (id: string) => {
        const user = users.find(u => u._id === id);
        if (user?.role === "superadmin") {
            toast.error("Cannot delete SuperAdmin user");
            return;
        }
        if (confirm("Are you sure you want to delete this user?")) {
            const updated = users.filter((user) => user._id !== id);
            setUsersState(updated);
            setUsers(updated);
            toast.success("User deleted");
        }
    }

    const clearFilters = () => {
        setFilters({ role: "", organizationId: "" });
    };

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        {
            header: "Role",
            accessor: (row: any) => (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                    {capitalizeFirstLetter(row.role)}
                </span>
            )
        },
        {
            header: "Organization",
            accessor: (row: any) => {
                if (!row.organizationId) return "Global";
                const org = organizations.find(o => o._id === row.organizationId);
                return org?.name || "Unknown";
            }
        },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                    {capitalizeFirstLetter(row.status || "active")}
                </span>
            )
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
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Access Control</p>
                        <h1 className="text-2xl font-black text-slate-900">Users</h1>
                        <p className="text-sm text-slate-500">Manage administrators and access across organizations.</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition hover:bg-slate-200"
                        >
                            <span className="inline-flex items-center gap-2"><Filter size={16} /> Filter Users</span>
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-800"
                        >
                            <span className="inline-flex items-center gap-2"><Plus size={16} /> Add User</span>
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Role</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.role}
                                    onChange={e => setFilters({ ...filters, role: e.target.value })}
                                >
                                    <option value="">All Roles</option>
                                    <option value="admin">Admin</option>
                                    <option value="manager">Manager</option>
                                    <option value="driver">Driver</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Organization</label>
                                <select
                                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                    value={filters.organizationId}
                                    onChange={e => setFilters({ ...filters, organizationId: e.target.value })}
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

                <Table columns={columns} data={filteredUsers} loading={false} />

                {isPopupOpen("userModal") && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <h2 className="text-xl font-black text-slate-900">{editingUser ? "Edit User" : "New User"}</h2>
                            <p className="text-xs text-slate-500">Define roles and assign organization scope.</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Name</label>
                                    <input type="text" className={`w-full rounded-xl border ${errors.name ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                        value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                    {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email</label>
                                    <input type="email" className={`w-full rounded-xl border ${errors.email ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                        value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Password</label>
                                    <input type="password" className={`w-full rounded-xl border ${errors.password ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                        placeholder={editingUser ? "Leave blank to keep current" : ""}
                                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    {errors.password && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.password}</p>}
                                </div>
                                <div>
                                    <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as "admin" | "manager" | "driver" | "superadmin" })}>
                                        <option value="admin">Admin</option>
                                        <option value="manager">Manager</option>
                                        <option value="driver">Driver</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</label>
                                    <select className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as "active" | "inactive" })}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Organization</label>
                                    <select className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                        value={formData.organizationId} onChange={e => setFormData({ ...formData, organizationId: e.target.value })}>
                                        <option value="">Select Organization (Optional)</option>
                                        {organizations.map((org: any) => (
                                            <option key={org._id} value={org._id}>{org.name}</option>
                                        ))}
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
            </div>
        </ApiErrorBoundary>
    );
}
