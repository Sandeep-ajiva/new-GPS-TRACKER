"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const demoOrganizations = [
    { _id: "org_ajiva", name: "Ajiva Tracker" },
    { _id: "org_north", name: "North Branch" },
];

const demoUsers = [
    { _id: "user_1", name: "Admin User", email: "admin@ajiva.com", role: "admin", organizationId: "org_ajiva" },
    { _id: "user_2", name: "Super Admin", email: "superadmin@ajiva.com", role: "superadmin", organizationId: null },
];

export default function UsersPage() {
    const [users, setUsers] = useState(demoUsers);
    const [organizations] = useState(demoOrganizations);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "superadmin",
        organizationId: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            setUsers((prev) =>
                prev.map((user) =>
                    user._id === editingUser._id
                        ? { ...user, ...formData }
                        : user
                )
            );
            toast.success("User updated successfully");
        } else {
            setUsers((prev) => [
                ...prev,
                { _id: `user_${Date.now()}`, ...formData },
            ]);
            toast.success("User created successfully");
        }
        closeModal();
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ name: "", email: "", password: "", role: "admin", organizationId: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (user: any) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: "", // Don't show password
            role: user.role,
            organizationId: user.organizationId?._id || user.organizationId || ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingUser(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this user?")) {
            setUsers((prev) => prev.filter((user) => user._id !== id));
            toast.success("User deleted");
        }
    }

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        {
            header: "Role",
            accessor: (row: any) => (
                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-200">
                    {row.role}
                </span>
            )
        },
        { header: "Organization", accessor: (row: any) => row.organizationId?.name || "Global" },
        {
            header: "Actions", accessor: (row: any) => (
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

            <Table columns={columns} data={users} loading={false} variant="dark" />

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
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Email</label>
                                <input type="email" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Password</label>
                                <input type="password" required={!editingUser} className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    placeholder={editingUser ? "Leave blank to keep current" : ""}
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Role</label>
                                <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="admin">Organization Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
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
