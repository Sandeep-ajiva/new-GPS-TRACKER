"use client";

import { useState } from "react";
import {
    useGetUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation
} from "@/redux/api/usersApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Key } from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
    const { data: users, isLoading, error } = useGetUsersQuery({});
    const { data: organizations } = useGetOrganizationsQuery({});
    const [createUser] = useCreateUserMutation();
    const [updateUser] = useUpdateUserMutation();
    const [deleteUser] = useDeleteUserMutation();

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
        try {
            if (editingUser) {
                const { password, ...updateData } = formData;
                // Only send password if it's changed (simple check)
                const finalData = password ? formData : updateData;
                await updateUser({ id: editingUser._id, ...finalData }).unwrap();
                toast.success("User updated successfully");
            } else {
                await createUser(formData).unwrap();
                toast.success("User created successfully");
            }
            closeModal();
        } catch (error: any) {
            toast.error(error?.data?.message || "Something went wrong");
        }
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
            try {
                await deleteUser(id).unwrap();
                toast.success("User deleted");
            } catch (error: any) {
                toast.error(error?.data?.message || "Failed to delete");
            }
        }
    }

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        { header: "Role", accessor: (row: any) => <span className="uppercase font-bold text-xs">{row.role}</span> },
        { header: "Organization", accessor: (row: any) => row.organizationId?.name || "Global" },
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
        <ApiErrorBoundary hasError={!!error}>
            <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Users</h1>
                    <p className="text-sm text-gray-500">Manage administrators and access.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Add User
                </button>
            </div>

            <Table columns={columns} data={users} loading={isLoading} />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? "Edit User" : "New User"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Name</label>
                                <input type="text" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                                <input type="password" required={!editingUser} className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder={editingUser ? "Leave blank to keep current" : ""}
                                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                                <select required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="admin">Organization Admin</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                            </div>
                            {formData.role === 'admin' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Organization</label>
                                    <select required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={formData.organizationId} onChange={e => setFormData({ ...formData, organizationId: e.target.value })}>
                                        <option value="">Select Organization</option>
                                        {organizations?.map((org: any) => (
                                            <option key={org._id} value={org._id}>{org.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button type="button" onClick={closeModal} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-[#1877F2] text-white rounded-xl text-sm font-bold hover:bg-blue-700">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </ApiErrorBoundary>
    );
}
