"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const demoOrganizations = [
    { _id: "org_ajiva", name: "Ajiva Tracker" },
    { _id: "org_north", name: "North Branch" },
];

const demoVehicles = [
    { _id: "veh_1", organizationId: "org_ajiva", vehicleType: "car", vehicleNumber: "DL 10CK1840", model: "Camry", status: "active" },
    { _id: "veh_2", organizationId: "org_north", vehicleType: "truck", vehicleNumber: "PB 10AX2234", model: "Tata 407", status: "inactive" },
    { _id: "veh_3", organizationId: "org_ajiva", vehicleType: "bus", vehicleNumber: "DL 10CK1900", model: "Volvo", status: "active" },
];

export default function VehiclesPage() {
    const router = useRouter();
    const [vehicles, setVehicles] = useState(demoVehicles);
    const [organizations] = useState(demoOrganizations);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [formData, setFormData] = useState({
        organizationId: "",
        vehicleType: "car",
        vehicleNumber: "",
        model: ""
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingVehicle) {
            setVehicles((prev) =>
                prev.map((vehicle) =>
                    vehicle._id === editingVehicle._id ? { ...vehicle, ...formData } : vehicle
                )
            );
            toast.success("Vehicle updated successfully");
        } else {
            setVehicles((prev) => [
                ...prev,
                { _id: `veh_${Date.now()}`, status: "active", ...formData },
            ]);
            toast.success("Vehicle created successfully");
        }
        closeModal();
    };

    const openCreateModal = () => {
        setEditingVehicle(null);
        setFormData({ organizationId: "", vehicleType: "car", vehicleNumber: "", model: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (vehicle: any) => {
        setEditingVehicle(vehicle);
        setFormData({
            organizationId: vehicle.organizationId?._id || vehicle.organizationId, // Handle populated or id
            vehicleType: vehicle.vehicleType,
            vehicleNumber: vehicle.vehicleNumber,
            model: vehicle.model || ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingVehicle(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this vehicle?")) {
            setVehicles((prev) => prev.filter((vehicle) => vehicle._id !== id));
            toast.success("Vehicle deleted");
        }
    }

    const filteredVehicles = useMemo(() => {
        const trimmed = searchTerm.trim().toLowerCase();
        return vehicles.filter((vehicle) => {
            const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter;
            const matchesType = typeFilter === "all" || vehicle.vehicleType === typeFilter;
            const matchesSearch = !trimmed || vehicle.vehicleNumber.toLowerCase().includes(trimmed);
            return matchesStatus && matchesType && matchesSearch;
        });
    }, [vehicles, searchTerm, statusFilter, typeFilter]);

    const columns = [
        { header: "Number", accessor: "vehicleNumber" },
        { header: "Type", accessor: (row: any) => <span className="capitalize">{row.vehicleType}</span> },
        { header: "Model", accessor: "model" },
        { header: "Organization", accessor: (row: any) => row.organizationId?.name || "N/A" },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${row.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/20 text-emerald-200'
                    : 'border-rose-500/30 bg-rose-500/20 text-rose-200'
                    }`}>
                    {row.status || "inactive"}
                </span>
            )
        },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button onClick={() => router.push(`/superadmin/vehicles/${row._id}`)} className="text-emerald-200 hover:text-emerald-100"><Eye size={16} /></button>
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
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Fleet</p>
                        <h1 className="text-2xl font-black text-slate-100">Vehicles</h1>
                        <p className="text-sm text-slate-400">Manage your fleet vehicles here.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                        <span className="inline-flex items-center gap-2"><Plus size={16} /> Add Vehicle</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap gap-2">
                        {(["all", "active", "inactive"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setStatusFilter(status)}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                                    statusFilter === status
                                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                                        : "border-slate-800/80 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                        <select
                            value={typeFilter}
                            onChange={(event) => setTypeFilter(event.target.value)}
                            className="rounded-full border border-slate-800/80 bg-slate-950/60 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-300"
                        >
                            <option value="all">All Types</option>
                            <option value="car">Car</option>
                            <option value="truck">Truck</option>
                            <option value="bus">Bus</option>
                            <option value="bike">Bike</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by vehicle number..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                </div>

            <Table columns={columns} data={filteredVehicles} loading={false} variant="dark" />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
                        <h2 className="text-xl font-black text-slate-100">{editingVehicle ? "Edit Vehicle" : "New Vehicle"}</h2>
                        <p className="text-xs text-slate-400">Define fleet vehicles and assign organizations.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle Type</label>
                                <select required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}>
                                    <option value="car">Car</option>
                                    <option value="truck">Truck</option>
                                    <option value="bus">Bus</option>
                                    <option value="bike">Bike</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Vehicle Number</label>
                                <input type="text" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Model</label>
                                <input type="text" className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
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
