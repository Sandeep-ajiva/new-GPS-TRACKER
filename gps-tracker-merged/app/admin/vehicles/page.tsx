"use client";

import { useState } from "react";
import {
    useGetVehiclesQuery,
    useCreateVehicleMutation,
    useUpdateVehicleMutation,
    useDeleteVehicleMutation
} from "@/redux/api/vehicleApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function VehiclesPage() {
    const { data: vehicles, isLoading, error } = useGetVehiclesQuery({});
    const { data: organizations } = useGetOrganizationsQuery({});
    const [createVehicle] = useCreateVehicleMutation();
    const [updateVehicle] = useUpdateVehicleMutation();
    const [deleteVehicle] = useDeleteVehicleMutation();

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
        try {
            if (editingVehicle) {
                await updateVehicle({ id: editingVehicle._id, ...formData }).unwrap();
                toast.success("Vehicle updated successfully");
            } else {
                await createVehicle(formData).unwrap();
                toast.success("Vehicle created successfully");
            }
            closeModal();
        } catch (error: any) {
            toast.error(error?.data?.message || "Something went wrong");
        }
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
            try {
                await deleteVehicle(id).unwrap();
                toast.success("Vehicle deleted");
            } catch (error: any) {
                toast.error(error?.data?.message || "Failed to delete");
            }
        }
    }

    const columns = [
        { header: "Number", accessor: "vehicleNumber" },
        { header: "Type", accessor: (row: any) => <span className="capitalize">{row.vehicleType}</span> },
        { header: "Model", accessor: "model" },
        { header: "Organization", accessor: (row: any) => row.organizationId?.name || "N/A" },
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
                    <h1 className="text-2xl font-black text-gray-900">Vehicles</h1>
                    <p className="text-sm text-gray-500">Manage your fleet vehicles here.</p>
                </div>
                <button
                    onClick={openCreateModal}
                    className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus size={16} /> Add Vehicle
                </button>
            </div>

            <Table columns={columns} data={vehicles} loading={isLoading} />

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
                        <h2 className="text-xl font-bold mb-4">{editingVehicle ? "Edit Vehicle" : "New Vehicle"}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
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
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Type</label>
                                <select required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.vehicleType} onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}>
                                    <option value="car">Car</option>
                                    <option value="truck">Truck</option>
                                    <option value="bus">Bus</option>
                                    <option value="bike">Bike</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vehicle Number</label>
                                <input type="text" required className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.vehicleNumber} onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Model</label>
                                <input type="text" className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.model} onChange={e => setFormData({ ...formData, model: e.target.value })} />
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
