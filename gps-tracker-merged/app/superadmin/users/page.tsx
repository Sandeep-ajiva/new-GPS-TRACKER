"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/redux/api/usersApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

interface ApiUser {
  _id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  role: string;
  organizationId?: string | { _id: string; name: string };
}

export default function UsersPage() {
    const { data: usersData, isLoading } = useGetUsersQuery({});
    const { data: orgsData } = useGetOrganizationsQuery({});

    const [createUser] = useCreateUserMutation();
    const [updateUser] = useUpdateUserMutation();
    const [deleteUser] = useDeleteUserMutation();

    const users: ApiUser[] = useMemo(() => {
        if (!usersData?.docs) return [];
        return usersData.docs.map((u: Record<string, any>) => ({
            _id: u._id,
            name: u.firstName ? `${u.firstName} ${u.lastName}` : (u.name || "Unknown"),
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            role: u.role,
            organizationId: u.organizationId
        }));
    }, [usersData]);
    
    const organizations = useMemo(() => orgsData?.docs || [], [orgsData]);
    const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "superadmin">("all");
    const [searchTerm, setSearchTerm] = useState("");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "superadmin",
        organizationId: ""
    });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const userSchema = useMemo(() => {
        const base = z.object({
            name: z.string().min(1, "Name is required"),
            email: z.string().email("Valid email is required"),
            password: z.string().optional(),
            role: z.enum(["admin", "superadmin"]),
            organizationId: z.string().optional(),
        });

        return base.superRefine((val, ctx) => {
            if (!editingUser && !val.password) {
                ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required" });
            }
            if (val.password && val.password.length < 6) {
                ctx.addIssue({ code: "custom", path: ["password"], message: "Password must be at least 6 characters" });
            }
            if (val.role === "admin" && !val.organizationId) {
                ctx.addIssue({ code: "custom", path: ["organizationId"], message: "Organization is required" });
            }
        });
    }, [editingUser]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        const parsed = userSchema.safeParse(formData);
        if (!parsed.success) {
            const next: Record<string, string> = {};
            parsed.error.issues.forEach((issue) => {
                const key = String(issue.path[0] || "form");
                if (!next[key]) next[key] = issue.message;
            });
            setFieldErrors(next);
            return;
        }
        try {
            // Split name if needed or backend handles 'name'
            // Assuming backend wrapper expects firstName/lastName for managers
            const [firstName, ...rest] = formData.name.split(" ");
            const lastName = rest.join(" ");

            const payload = {
                ...formData,
                firstName: firstName || formData.name,
                lastName: lastName || "",
            };

            if (editingUser) {
                await updateUser({ id: editingUser._id, ...payload }).unwrap();
                toast.success("User updated successfully");
            } else {
                await createUser(payload).unwrap();
                toast.success("User created successfully");
            }
            closeModal();
        } catch (error: any) {
             toast.error(error.data?.message || "Failed to save user");
        }
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "admin", organizationId: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (user: ApiUser) => {
        setEditingUser(user);
        const orgId = typeof user.organizationId === 'object' ? user.organizationId?._id : user.organizationId;
        setFormData({
            name: user.name || "",
            email: user.email,
            password: "", // Don't show password
            role: user.role,
            organizationId: orgId || ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this user?")) {
            try {
                await deleteUser(id).unwrap();
                toast.success("User deleted");
            } catch (error: any) {
                toast.error(error.data?.message || "Failed to delete user");
            }
        }
    }

    const filteredUsers = useMemo(() => {
        const trimmed = searchTerm.trim().toLowerCase();
        return users.filter((user) => {
            const matchesRole = roleFilter === "all" || user.role === roleFilter;
            const matchesSearch =
                !trimmed ||
                user.name?.toLowerCase().includes(trimmed) ||
                user.email.toLowerCase().includes(trimmed);
            return matchesRole && matchesSearch;
        });
    }, [users, roleFilter, searchTerm]);

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        {
            header: "Role",
            accessor: (row: ApiUser) => (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    {row.role}
                </span>
            )
        },
        { header: "Organization", accessor: (row: ApiUser) => typeof row.organizationId === 'object' ? row.organizationId?.name : "Global" },
        {
            header: "Actions", accessor: (row: ApiUser) => (
                <div className="flex gap-2">
                    <button onClick={() => openEditModal(row)} className="text-slate-200 hover:text-white"><Edit size={16} /></button>
                    <button onClick={() => handleDelete(row._id)} className="text-rose-300 hover:text-rose-200"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Access</p>
                        <h1 className="text-2xl font-black text-slate-100">Users</h1>
                        <p className="text-sm text-slate-400">Manage administrators and access.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                        <span className="inline-flex items-center gap-2"><Plus size={16} /> Add User</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap gap-2">
                        {(["all", "admin", "superadmin"] as const).map((role) => (
                            <button
                                key={role}
                                onClick={() => setRoleFilter(role)}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                                    roleFilter === role
                                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                                        : "border-slate-800/80 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                </div>

            <Table columns={columns} data={filteredUsers} loading={isLoading} variant="dark" />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
                        <h2 className="text-xl font-black text-slate-100">{editingUser ? "Edit User" : "New User"}</h2>
                        <p className="text-xs text-slate-400">Assign roles and scope by organization.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Name</label>
                                <input type="text" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                {fieldErrors.name && <p className="mt-1 text-[10px] font-bold text-rose-300">{fieldErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</label>
                                <input type="email" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                {fieldErrors.email && <p className="mt-1 text-[10px] font-bold text-rose-300">{fieldErrors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Password</label>
                                <input type="password" required={!editingUser} className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    placeholder={editingUser ? "Leave blank to keep current" : ""}
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                {fieldErrors.password && <p className="mt-1 text-[10px] font-bold text-rose-300">{fieldErrors.password}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Role</label>
                                <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="admin">Organization Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                                {fieldErrors.role && <p className="mt-1 text-[10px] font-bold text-rose-300">{fieldErrors.role}</p>}
                            </div>
                            {formData.role === 'admin' && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Organization</label>
                                    <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                        value={formData.organizationId} onChange={e => setFormData({ ...formData, organizationId: e.target.value })}>
                                        <option value="">Select Organization</option>
                                        {organizations.map((org: any) => (
                                            <option key={org._id} value={org._id}>{org.name}</option>
                                        ))}
                                    </select>
                                    {fieldErrors.organizationId && <p className="mt-1 text-[10px] font-bold text-rose-300">{fieldErrors.organizationId}</p>}
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-200 hover:bg-slate-900">Cancel</button>
                                <button type="submit" className="flex-1 rounded-xl bg-emerald-500/30 py-2.5 text-[11px] font-black uppercase tracking-widest text-emerald-100 hover:bg-emerald-500/40">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </ApiErrorBoundary>
    );
}
