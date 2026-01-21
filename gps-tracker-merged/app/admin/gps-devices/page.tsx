"use client";

import { useState } from "react";
import {
    useGetGpsDevicesQuery,
    useCreateGpsDeviceMutation,
    useUpdateGpsDeviceMutation,
    useDeleteGpsDeviceMutation
} from "@/redux/api/gpsDeviceApi";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function GpsDevicesPage() {
    const { data: devices, isLoading, error } = useGetGpsDevicesQuery({});
    const [createDevice] = useCreateGpsDeviceMutation();
    const [updateDevice] = useUpdateGpsDeviceMutation();
    const [deleteDevice] = useDeleteGpsDeviceMutation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any>(null);
    const [formData, setFormData] = useState({
        imei: "",
        simNumber: ""
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
            toast.error(error?.data?.message || "Something went wrong");
        }
    };

    const openCreateModal = () => {
        setEditingDevice(null);
        setFormData({ imei: "", simNumber: "" });
        setIsModalOpen(true);
    };

    const openEditModal = (device: any) => {
        setEditingDevice(device);
        setFormData({
            imei: device.imei,
            simNumber: device.simNumber || ""
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
                toast.error(error?.data?.message || "Failed to delete");
            }
        }
    }

    const columns = [
        { header: "IMEI", accessor: "imei" },
        { header: "SIM Number", accessor: "simNumber" },
        {
            header: "Status", accessor: (row: any) => (
                <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${row.currentVehicleId ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                    {row.currentVehicleId ? 'Assigned' : 'Unassigned'}
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
                    <h1 className="text-2xl font-black text-gray-900">GPS Devices</h1>
                    <p className="text-sm text-gray-500">Manage your GPS hardware inventory.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Add Device
                </button>
            </div>

            <Table columns={columns} data={devices} loading={isLoading} />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">{editingDevice ? "Edit Device" : "New Device"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">IMEI</label>
                                <input type="text" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.imei} onChange={e => setFormData({ ...formData, imei: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">SIM Number</label>
                                <input type="text" className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.simNumber} onChange={e => setFormData({ ...formData, simNumber: e.target.value })} />
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
