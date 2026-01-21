"use client";

import { useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const demoOrganizations = [
    { _id: "org_ajiva", name: "Ajiva Tracker", email: "admin@ajiva.com", phone: "+91 98765 43210", address: "Delhi HQ", status: "active" },
    { _id: "org_north", name: "North Branch", email: "north@ajiva.com", phone: "+91 98765 43211", address: "Chandigarh", status: "active" },
    { _id: "org_west", name: "West Branch", email: "west@ajiva.com", phone: "+91 98765 43212", address: "Jaipur", status: "inactive" },
];

export default function OrganizationsPage() {
    const [organizations, setOrganizations] = useState(demoOrganizations);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<any>(null);
    const [formData, setFormData] = useState({ name: "", email: "", phone: "", address: "" });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingOrg) {
            setOrganizations((prev) =>
                prev.map((org) =>
                    org._id === editingOrg._id ? { ...org, ...formData } : org
                )
            );
            toast.success("Organization updated successfully");
        } else {
            setOrganizations((prev) => [
                ...prev,
                {
                    _id: `org_${Date.now()}`,
                    status: "active",
                    ...formData,
                },
            ]);
            toast.success("Organization created successfully");
        }
        closeModal();
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
            setOrganizations((prev) => prev.filter((org) => org._id !== id));
            toast.success("Organization deleted");
        }
    }

    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${row.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/20 text-rose-200'
                    }`}>
                    {row.status}
                </span>
            )
        },
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
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Network</p>
                        <h1 className="text-2xl font-black text-slate-100">Organizations</h1>
                        <p className="text-sm text-slate-400">Manage client organizations and branches.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                        <span className="inline-flex items-center gap-2"><Plus size={16} /> Add Organization</span>
                    </button>
                </div>

            <Table columns={columns} data={organizations} loading={false} variant="dark" />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
                        <h2 className="text-xl font-black text-slate-100">{editingOrg ? "Edit Organization" : "New Organization"}</h2>
                        <p className="text-xs text-slate-400">Keep branches aligned with admin access.</p>
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
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Phone</label>
                                <input type="text" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Address</label>
                                <textarea className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                            </div>
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
