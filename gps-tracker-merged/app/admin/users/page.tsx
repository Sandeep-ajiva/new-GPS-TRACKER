"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    useGetUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation
} from "@/redux/api/usersApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

import Validator from "../Helpers/validators";
import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    role: "admin" | "manager" | "superadmin" | "driver";
    organizationId: any;
    status: "active" | "inactive";
}

export default function UsersPage() {
    const { openPopup, closePopup, isPopupOpen } = usePopups();

    // API Hooks
    const { data: usersData, isLoading: isUsersLoading } = useGetUsersQuery(undefined);
    const { data: orgData, isLoading: isOrgLoading } = useGetOrganizationsQuery(undefined);

    const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

    const users = (usersData?.data as User[]) || [];
    const organizations = (orgData?.data as any[]) || [];

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        role: "",
        organizationId: ""
    });

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
        passwordHash: "",
        role: "admin" as "admin" | "manager",
        organizationId: "",
        status: "active" as "active" | "inactive"
    });
    const [errors, setErrors] = useState<any>({});

    const Rules = useMemo(() => ({
        firstName: { required: true, errorMessage: "First Name is required." },
        lastName: { required: true, errorMessage: "Last Name is required." },
        email: { required: true, type: "email" as const, errorMessage: "Valid Email is required." },
        mobile: { required: true, errorMessage: "Mobile is required." },
        // passwordHash is required only for creation
    }), []);

    const validator = new Validator(Rules);

    const handleBlur = async (name: string, value: any) => {
        const validationErrors = await validator.validateFormField(name, value);
        setErrors((prev: any) => ({
            ...prev,
            [name]: validationErrors[name]
        }));
    };

    const filteredUsers = useMemo(() => {
        let filtered = users;
        if (filters.role) {
            filtered = filtered.filter(u => u.role === filters.role);
        }
        if (filters.organizationId) {
            filtered = filtered.filter(u => (u.organizationId?._id || u.organizationId) === filters.organizationId);
        }
        return filtered;
    }, [users, filters]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Manual check for password on creation
        if (!editingUser && !formData.passwordHash) {
            setErrors((prev: any) => ({ ...prev, passwordHash: "Password is required" }));
            toast.error("Password is required for new users");
            return;
        }

        const validationErrors = await validator.validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        try {
            if (editingUser) {
                // Remove passwordHash if empty to avoid overwriting
                const { passwordHash, ...updateData } = formData;
                // Backend might not support password update via this endpoint based on controller?
                // Controller 'updateUser' allows: firstName, lastName, email, mobile, status.
                // It does NOT update password. Good.
                await updateUser({ id: editingUser._id, ...updateData }).unwrap();
                toast.success("User updated successfully");
            } else {
                await createUser({ ...formData }).unwrap();
                toast.success("User created successfully");
            }
            closeModal();
        } catch (err: any) {
            toast.error(err?.data?.message || "Operation failed");
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({
            firstName: "",
            lastName: "",
            email: "",
            mobile: "",
            passwordHash: "",
            role: "admin",
            organizationId: "",
            status: "active"
        });
        setErrors({});
        openPopup("userModal");
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
        setFormData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            mobile: user.mobile || "",
            passwordHash: "", // Don't show password
            role: user.role === "superadmin" || user.role === "driver" ? "admin" : user.role, // Fallback if viewing weird role
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
            try {
                await deleteUser(id).unwrap();
                toast.success("User deleted");
            } catch (err: any) {
                toast.error(err?.data?.message || "Delete failed");
            }
        }
    }

    const clearFilters = () => {
        setFilters({ role: "", organizationId: "" });
    };

    const columns = [
        { header: "Name", accessor: (row: any) => `${row.firstName} ${row.lastName}` },
        { header: "Email", accessor: "email" },
        { header: "Mobile", accessor: "mobile" },
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
                if (typeof row.organizationId === 'object') return row.organizationId.name;
                const org = organizations.find(o => o._id === row.organizationId);
                return org?.name || "Unknown";
            }
        },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                    {capitalizeFirstLetter(row.status || "active")}
                </span>
            )
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-slate-700 hover:text-slate-900"><Edit size={16} /></button>
                    {!isLoading && row.role !== 'superadmin' && (
                        <button onClick={() => handleDelete(row._id)} className="text-rose-600 hover:text-rose-700"><Trash2 size={16} /></button>
                    )}
                </div>
            )
        }
    ];

    const isLoading = isUsersLoading || isOrgLoading;

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

                <Table columns={columns} data={filteredUsers} loading={isLoading} />

                {isPopupOpen("userModal") && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
                            <h2 className="text-xl font-black text-slate-900">{editingUser ? "Edit User" : "New User"}</h2>
                            <p className="text-xs text-slate-500">Define roles and assign organization scope.</p>
                            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">First Name</label>
                                        <input type="text" className={`w-full rounded-xl border ${errors.firstName ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                            value={formData.firstName}
                                            onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                            onBlur={e => handleBlur("firstName", e.target.value)}
                                        />
                                        {errors.firstName && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.firstName}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Last Name</label>
                                        <input type="text" className={`w-full rounded-xl border ${errors.lastName ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                            value={formData.lastName}
                                            onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                            onBlur={e => handleBlur("lastName", e.target.value)}
                                        />
                                        {errors.lastName && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.lastName}</p>}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Email</label>
                                    <input type="email" className={`w-full rounded-xl border ${errors.email ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        onBlur={e => handleBlur("email", e.target.value)}
                                    />
                                    {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Mobile</label>
                                    <input type="text" className={`w-full rounded-xl border ${errors.mobile ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                        value={formData.mobile}
                                        onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                        onBlur={e => handleBlur("mobile", e.target.value)}
                                    />
                                    {errors.mobile && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.mobile}</p>}
                                </div>
                                {!editingUser && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Password</label>
                                        <input type="password" className={`w-full rounded-xl border ${errors.passwordHash ? 'border-red-500' : 'border-slate-200'} p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10`}
                                            value={formData.passwordHash}
                                            onChange={e => setFormData({ ...formData, passwordHash: e.target.value })}
                                            onBlur={e => handleBlur("passwordHash", e.target.value)}
                                        />
                                        {errors.passwordHash && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.passwordHash}</p>}
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Role</label>
                                        <select required className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                                            value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                                            <option value="admin">Admin</option>
                                            <option value="manager">Manager</option>
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
                                    <button type="submit" disabled={isCreating || isUpdating} className="flex-1 rounded-xl bg-slate-900 py-2.5 text-[11px] font-black uppercase tracking-widest text-white hover:bg-slate-800 disabled:opacity-50">
                                        {(isCreating || isUpdating) ? "Saving..." : "Save"}
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
