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

import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";
import { User as UserIcon, Mail, Phone, Lock, ShieldCheck, ToggleRight, Building2 } from "lucide-react";



export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    role: "admin" | "manager" | "superadmin" | "driver";
    organizationId?: string | { _id: string; name: string };
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

    const users = useMemo(() => (usersData?.data as User[]) || [], [usersData]);
    const organizations = useMemo(() => (orgData?.data as { _id: string; name: string }[]) || [], [orgData]);


    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        role: "",
        organizationId: ""
    });

    const [editingUser, setEditingUser] = useState<User | null>(null);





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

    const handleSubmit = async (data: Record<string, string | number | boolean | File>) => {
        try {
            if (editingUser) {
                // For update, exclude passwordHash if it wasn't meant to be updated here
                const { passwordHash, ...payload } = data;
                await updateUser({ id: editingUser._id, ...payload }).unwrap();
                toast.success("User updated successfully");
            } else {
                await createUser(data).unwrap();
                toast.success("User created successfully");
            }
            closeModal();
        } catch (err: unknown) {
            const error = err as { data?: { message?: string } };
            toast.error(error?.data?.message || "Operation failed");
        }
    };


    const userFormFields: FormField[] = [
        {
            name: "firstName",
            label: "First Name",
            type: "text",
            required: true,
            placeholder: "John",
            icon: <UserIcon size={14} className="text-slate-500" />,
        },
        {
            name: "lastName",
            label: "Last Name",
            type: "text",
            required: true,
            placeholder: "Doe",
            icon: <UserIcon size={14} className="text-slate-500" />,
        },
        {
            name: "email",
            label: "Email Address",
            type: "email",
            required: true,
            placeholder: "john@example.com",
            icon: <Mail size={14} className="text-slate-500" />,
        },
        {
            name: "mobile",
            label: "Mobile Number",
            type: "tel",
            required: true,
            placeholder: "+1 234 567 890",
            icon: <Phone size={14} className="text-slate-500" />,
        },
        // Password only on creation
        ...(!editingUser ? [{
            name: "passwordHash",
            label: "Password",
            type: "password" as const,
            required: true,
            placeholder: "********",
            icon: <Lock size={14} className="text-slate-500" />,
        }] : []),
        {
            name: "role",
            label: "Role",
            type: "select",
            required: true,
            options: [
                { label: "Admin", value: "admin" },
                { label: "Manager", value: "manager" },
            ],
            icon: <ShieldCheck size={14} className="text-slate-500" />,
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
            icon: <ToggleRight size={14} className="text-slate-500" />,
        },
        {
            name: "organizationId",
            label: "Organization",
            type: "select",
            options: organizations.map(org => ({ label: org.name, value: org._id })),
            icon: <Building2 size={14} className="text-slate-500" />,
        },
    ];


    const openCreateModal = () => {
        setEditingUser(null);
        openPopup("userModal");
    };

    const openEditModal = (user: User) => {
        setEditingUser(user);
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
        { header: "Name", accessor: (row: User) => `${row.firstName} ${row.lastName}` },
        { header: "Email", accessor: "email" },
        { header: "Mobile", accessor: "mobile" },
        {
            header: "Role",
            accessor: (row: User) => (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-700">
                    {capitalizeFirstLetter(row.role)}
                </span>
            )
        },
        {
            header: "Organization",
            accessor: (row: User) => {
                if (!row.organizationId) return "Global";
                if (typeof row.organizationId === 'object') return row.organizationId.name;
                const org = organizations.find(o => o._id === row.organizationId);
                return org?.name || "Unknown";
            }
        },
        {
            header: "Status", accessor: (row: User) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                >
                    {capitalizeFirstLetter(row.status || "active")}
                </span>
            )
        },
        {
            header: "Actions", accessor: (row: User) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-slate-700 hover:text-slate-900"><Edit size={16} /></button>
                    {(!isCreating && !isUpdating && !isDeleting) && row.role !== 'superadmin' && (
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
                                        value={filters.organizationId} onChange={e => setFilters({ ...filters, organizationId: e.target.value })}>
                                        <option value="">All Organizations</option>
                                        {organizations.map((org) => (
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

                <DynamicModal
                    isOpen={isPopupOpen("userModal")}
                    onClose={closeModal}
                    title={editingUser ? "Edit User" : "New User"}
                    description="Define roles and assign organization scope."
                    fields={userFormFields}
                    initialData={editingUser ? {
                        firstName: editingUser.firstName,
                        lastName: editingUser.lastName,
                        email: editingUser.email,
                        mobile: editingUser.mobile,
                        role: editingUser.role === "superadmin" || editingUser.role === "driver" ? "admin" : editingUser.role,
                        organizationId: editingUser.organizationId?._id || editingUser.organizationId || "",
                        status: editingUser.status,
                    } : undefined}
                    onSubmit={handleSubmit}
                    submitLabel={editingUser ? "Update User" : "Create User"}
                />

            </div>
        </ApiErrorBoundary>
    );
}
