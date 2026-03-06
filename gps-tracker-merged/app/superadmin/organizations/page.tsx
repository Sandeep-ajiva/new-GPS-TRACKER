"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { ExternalLink, Plus, Edit, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OrganizationCreateModal from "@/components/admin/Modals/OrganizationCreateModal";
import LocationSelects from "@/components/common/LocationSelects";
import PhoneInputField from "@/components/common/PhoneInputField";

import {
    useGetOrganizationsQuery,
    useCreateOrganizationMutation,
    useUpdateOrganizationMutation,
    useDeleteOrganizationMutation,
} from "@/redux/api/organizationApi";

interface ApiOrg {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address?: { city?: string; state?: string } | any;
    status: string;
    adminUser?: string; // or object
}

export default function OrganizationsPage() {
    const router = useRouter();
    const { data: orgsData, isLoading } = useGetOrganizationsQuery({});
    const [createOrg] = useCreateOrganizationMutation();
    const [updateOrg] = useUpdateOrganizationMutation();
    const [deleteOrg] = useDeleteOrganizationMutation();

    const organizations: ApiOrg[] = useMemo(() => orgsData?.data || [], [orgsData]);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [searchTerm, setSearchTerm] = useState("");

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        addressLine: "",
        country: "",
        state: "",
        city: "",
        pincode: ""
    });

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOrg) {
                await updateOrg({
                    id: editingOrg._id,
                    body: {
                        name: formData.name,
                        email: formData.email,
                        phone: formData.phone,
                        address: {
                            addressLine: formData.addressLine,
                            city: formData.city,
                            state: formData.state,
                            country: formData.country,
                            pincode: formData.pincode || undefined
                        }
                    }
                }).unwrap();
                toast.success("Organization updated successfully");
            }
            closeEditModal();
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to update organization");
        }
    };

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
    };

    const openEditModal = (org: any) => {
        const normalizedAddress =
            typeof org?.address === "string"
                ? { addressLine: org.address, city: "", state: "", country: "", pincode: "" }
                : (org?.address || { addressLine: "", city: "", state: "", country: "", pincode: "" });
        setEditingOrg(org);
        setFormData({
            name: org.name,
            email: org.email,
            phone: org.phone,
            addressLine: normalizedAddress.addressLine || "",
            city: normalizedAddress.city || "",
            state: normalizedAddress.state || "",
            country: normalizedAddress.country || "",
            pincode: normalizedAddress.pincode || ""
        });
        setIsEditModalOpen(true);
    };

    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingOrg(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this organization?")) {
            try {
                await deleteOrg(id).unwrap();
                toast.success("Organization deleted");
            } catch (error: any) {
                toast.error(error.data?.message || "Failed to delete organization");
            }
        }
    }

    const filteredOrganizations = useMemo(() => {
        const trimmed = searchTerm.trim().toLowerCase();
        return organizations.filter((org) => {
            const matchesStatus = statusFilter === "all" || org.status === statusFilter;
            const matchesSearch =
                !trimmed ||
                org.name.toLowerCase().includes(trimmed) ||
                org.email.toLowerCase().includes(trimmed);
            return matchesStatus && matchesSearch;
        });
    }, [organizations, searchTerm, statusFilter]);

    const columns = [
        { header: "Name", accessor: "name" },
        // { header: "Admin", accessor: "adminName" }, // Admin name not directly in org object unless populated
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        {
            header: "Status", accessor: (row: ApiOrg) => (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${row.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/20 text-rose-200'
                    }`}>
                    {row.status}
                </span>
            )
        },
        {
            header: "Actions", accessor: (row: ApiOrg) => (
                <div className="flex gap-2">
                    <button onClick={() => router.push(`/superadmin/organizations/${row._id}`)} className="text-emerald-200 hover:text-emerald-100"><Eye size={16} /></button>
                    <button
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                sessionStorage.setItem("adminSelectedOrgId", row._id);
                                sessionStorage.setItem("adminFromSuperadmin", "true");
                            }
                            router.push("/admin");
                        }}
                        className="text-sky-200 hover:text-sky-100"
                    >
                        <ExternalLink size={16} />
                    </button>
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

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap gap-2">
                        {(["all", "active", "inactive"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${statusFilter === status
                                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                                    : "border-slate-800/80 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                                    }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Search by org name or email..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                </div>

                <Table columns={columns} data={filteredOrganizations} loading={isLoading} variant="dark" />

                <OrganizationCreateModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    variant="dark"
                    onCreate={async (payload) => {
                        try {
                            await createOrg({
                                ...payload,
                                settings: { speedLimit: 80 }
                            }).unwrap();
                            toast.success("Organization created successfully");
                        } catch (error: any) {
                            toast.error(error.data?.message || "Failed to create organization");
                        }
                    }}
                />

                {isEditModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                        <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
                            <h2 className="text-xl font-black text-slate-100">{editingOrg ? "Edit Organization" : "New Organization"}</h2>
                            <p className="text-xs text-slate-400">Keep branches aligned with admin access.</p>
                            <form onSubmit={handleEditSubmit} className="space-y-4">
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
                                    <PhoneInputField
                                        value={formData.phone}
                                        onChange={(val) => setFormData({ ...formData, phone: val })}
                                        placeholder="Enter phone number"
                                        required
                                        variant="dark"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Address Line</label>
                                    <input
                                        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                        value={formData.addressLine}
                                        onChange={e => setFormData({ ...formData, addressLine: e.target.value })}
                                        placeholder="123 Business Way"
                                        required
                                    />
                                </div>
                                <LocationSelects
                                    variant="dark"
                                    country={formData.country}
                                    state={formData.state}
                                    city={formData.city}
                                    onChange={(next) => setFormData({ ...formData, ...next })}
                                />
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pincode</label>
                                    <input
                                        className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                        value={formData.pincode}
                                        onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                        placeholder="e.g. 110001"
                                    />
                                </div>
                                <div className="flex gap-3 mt-6">
                                    <button type="button" onClick={closeEditModal} className="flex-1 rounded-xl border border-slate-800 bg-slate-950/70 py-2.5 text-[11px] font-black uppercase tracking-widest text-slate-200 hover:bg-slate-900">Cancel</button>
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
