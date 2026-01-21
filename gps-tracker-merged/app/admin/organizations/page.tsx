"use client";

import { useState } from "react";
import {
    useGetOrganizationsQuery,
    useCreateOrganizationMutation,
    useUpdateOrganizationMutation,
    useDeleteOrganizationMutation
} from "@/redux/api/organizationApi";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function OrganizationsPage() {
    const { data: organizations, isLoading, error } = useGetOrganizationsQuery({});
    const [createOrg] = useCreateOrganizationMutation();
    const [updateOrg] = useUpdateOrganizationMutation();
    const [deleteOrg] = useDeleteOrganizationMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<any>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOrg) {
                await updateOrg({ id: editingOrg._id, ...formData }).unwrap();
                toast.success("Organization updated successfully");
            } else {
                await createOrg(formData).unwrap();
                toast.success("Organization created successfully");
            }
            closeModal();
        } catch (error: any) {
            toast.error(error?.data?.message || "Something went wrong");
        }
    };

    const openCreateModal = () => {
        setEditingOrg(null);
        setFormData({ name: "", email: "", phone: "", address: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (org: any) => {
        setEditingOrg(org);
        setFormData({
            name: org.name,
            email: org.email,
            phone: org.phone,
            address: org.address || ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingOrg(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this organization?")) {
            try {
                await deleteOrg(id).unwrap();
                toast.success("Organization deleted");
            } catch (error: any) {
                toast.error(error?.data?.message || "Failed to delete");
            }
        }
    }

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {row.status}
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
        <ApiErrorBoundary hasError={!!error}>
            <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900">Organizations</h1>
                    <p className="text-sm text-gray-500">Manage your client organizations here.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Add Organization
                </button>
            </div>

            <Table columns={columns} data={organizations} loading={isLoading} />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">{editingOrg ? "Edit Organization" : "New Organization"}</h2>
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
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                                <input type="text" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Address</label>
                                <textarea className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
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
