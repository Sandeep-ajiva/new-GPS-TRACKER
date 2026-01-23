"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  useGetGpsDevicesQuery,
  useCreateGpsDeviceMutation,
  useUpdateGpsDeviceMutation,
  useDeleteGpsDeviceMutation,
} from "@/redux/api/gpsDeviceApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

interface ApiGpsDevice {
  _id: string;
  imei: string;
  simNumber?: string;
  deviceModel?: string;
  status: string;
  organizationId: string | { _id: string; name: string };
  vehicleId?: string; // or object depending on backend
}

export default function GpsDevicesPage() {
    const { data: devicesData, isLoading } = useGetGpsDevicesQuery({});
    const { data: orgsData } = useGetOrganizationsQuery({});
    const [createDevice] = useCreateGpsDeviceMutation();
    const [updateDevice] = useUpdateGpsDeviceMutation();
    const [deleteDevice] = useDeleteGpsDeviceMutation();

    const router = useRouter();
    const [assignmentFilter, setAssignmentFilter] = useState<"all" | "assigned" | "unassigned">("all");
    const [searchTerm, setSearchTerm] = useState("");

    const devices: ApiGpsDevice[] = useMemo(() => devicesData?.docs || [], [devicesData]);
    const organizations = useMemo(() => orgsData?.docs || [], [orgsData]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<ApiGpsDevice | null>(null);
    const [formData, setFormData] = useState({
        imei: "",
        simNumber: "",
        deviceModel: "",
        organizationId: "",
        status: "active"
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDevice) {
                await updateDevice({ id: editingDevice._id, ...formData }).unwrap();
                toast.success("Device updated successfully");
            } else {
                await createDevice(formData).unwrap();
                toast.success("Device created successfully");
            }
            closeModal();
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to save device");
        }
    };

    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({ imei: "", simNumber: "", deviceModel: "", organizationId: "", status: "active" });
        setIsModalOpen(true);
    };

    const openEditModal = (device: ApiGpsDevice) => {
        setEditingDevice(device);
        const orgId = typeof device.organizationId === 'object' ? device.organizationId._id : device.organizationId;
        setFormData({
            imei: device.imei,
            simNumber: device.simNumber || "",
            deviceModel: device.deviceModel || "",
            organizationId: orgId,
            status: device.status
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingDevice(null);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this device?")) {
            try {
                await deleteDevice(id).unwrap();
                toast.success("Device deleted");
            } catch (error: any) {
                toast.error(error.data?.message || "Failed to delete device");
            }
        }
    }

    const filteredDevices = useMemo(() => {
        const trimmed = searchTerm.trim().toLowerCase();
        return devices.filter((device) => {
            const isAssigned = Boolean(device.vehicleId);
            const matchesAssignment =
                assignmentFilter === "all" ||
                (assignmentFilter === "assigned" && isAssigned) ||
                (assignmentFilter === "unassigned" && !isAssigned);
            const matchesSearch = !trimmed || device.imei.toLowerCase().includes(trimmed);
            return matchesAssignment && matchesSearch;
        });
    }, [devices, assignmentFilter, searchTerm]);

    const columns = [
        { header: "IMEI", accessor: "imei" },
        { header: "SIM Number", accessor: "simNumber" },
        {
            header: "Status", accessor: (row: ApiGpsDevice) => (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${row.vehicleId
                    ? 'border-amber-500/30 bg-amber-500/20 text-amber-200'
                    : 'border-slate-500/30 bg-slate-500/20 text-slate-200'
                    }`}>
                    {row.vehicleId ? 'Assigned' : 'Unassigned'}
                </span>
            )
        },
        {
          header: "Organization",
          accessor: (row: ApiGpsDevice) => typeof row.organizationId === 'object' ? row.organizationId.name : "N/A"
        },
        {
            header: "Actions", accessor: (row: ApiGpsDevice) => (
                <div className="flex gap-2">
                    <button onClick={() => router.push(`/superadmin/gps-devices/${row._id}`)} className="text-emerald-200 hover:text-emerald-100"><Eye size={16} /></button>
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
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Hardware</p>
                        <h1 className="text-2xl font-black text-slate-100">GPS Devices</h1>
                        <p className="text-sm text-slate-400">Manage your GPS hardware inventory.</p>
                    </div>
                    <button
                        onClick={openCreateModal}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30"
                    >
                        <span className="inline-flex items-center gap-2"><Plus size={16} /> Add Device</span>
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap gap-2">
                        {(["all", "assigned", "unassigned"] as const).map((status) => (
                            <button
                                key={status}
                                onClick={() => setAssignmentFilter(status)}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                                    assignmentFilter === status
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
                        placeholder="Search by IMEI..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                </div>

            <Table columns={columns} data={filteredDevices} loading={isLoading} variant="dark" />

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-800/80 bg-slate-900/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
                        <h2 className="text-xl font-black text-slate-100">{editingDevice ? "Edit Device" : "New Device"}</h2>
                        <p className="text-xs text-slate-400">Register IMEI and SIM details.</p>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">IMEI</label>
                                <input type="text" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.imei} onChange={e => setFormData({ ...formData, imei: e.target.value })} />
                            </div>
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
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Device Model</label>
                                <input type="text" required className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.deviceModel} onChange={e => setFormData({ ...formData, deviceModel: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">SIM Number</label>
                                <input type="text" className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2 text-sm font-semibold text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                    value={formData.simNumber} onChange={e => setFormData({ ...formData, simNumber: e.target.value })} />
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
