"use client";
import React, { useState } from "react";
import { X, Car, Hash, Truck, User, Phone, Image as ImageIcon, Briefcase } from "lucide-react";
import { Vehicle, IApiError } from "@/types";
import { useCreateVehicleMutation, useUpdateVehicleMutation } from "@/redux/api/vehicleApi";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";
import { toast } from "sonner";

interface VehicleModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle?: Vehicle | null;
}

export default function VehicleModal({ isOpen, onClose, vehicle }: VehicleModalProps) {
    const [createVehicle, { isLoading: isCreating }] = useCreateVehicleMutation();
    const [updateVehicle, { isLoading: isUpdating }] = useUpdateVehicleMutation();
    const { data: orgsResponse } = useGetOrganizationsQuery(undefined);
    const organizations = orgsResponse?.data || [];

    const [formData, setFormData] = useState({
        vehicleType: vehicle?.vehicleType || "car",
        vehicleNumber: vehicle?.vehicleNumber || "",
        registrationNumber: vehicle?.registrationNumber || "",
        model: vehicle?.model || "",
        organizationId: vehicle ? (typeof vehicle.organizationId === 'string' ? vehicle.organizationId : vehicle.organizationId._id) : "",
        driverName: vehicle?.driverName || "",
        driverPhone: vehicle?.driverPhone || "",
        vehicleImage: vehicle?.vehicleImage || "",
        status: vehicle?.status || "active"
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (vehicle) {
                await updateVehicle({ id: vehicle._id, ...formData }).unwrap();
                toast.success("Vehicle updated successfully");
            } else {
                await createVehicle(formData).unwrap();
                toast.success("Vehicle created successfully");
            }
            onClose();
        } catch (error: unknown) {
            const apiError = error as IApiError;
            toast.error(apiError?.data?.message || "Failed to save vehicle");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">{vehicle ? "Edit Vehicle" : "Add New Vehicle"}</h2>
                        <p className="text-sm text-gray-500 font-medium tracking-tight">Enter vehicle and driver details</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 group">
                        <X size={20} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Vehicle Info */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Vehicle Information</h3>
                            
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Briefcase size={14} className="text-blue-500" />
                                    Organization
                                </label>
                                <select
                                    required
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={formData.organizationId}
                                    onChange={e => setFormData({ ...formData, organizationId: e.target.value })}
                                >
                                    <option value="">Select Organization</option>
                                    {organizations.map(org => (
                                        <option key={org._id} value={org._id}>{org.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Truck size={14} className="text-blue-500" />
                                        Type
                                    </label>
                                    <select
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        value={formData.vehicleType}
                                        onChange={e => setFormData({ ...formData, vehicleType: e.target.value })}
                                    >
                                        <option value="car">Car</option>
                                        <option value="bus">Bus</option>
                                        <option value="truck">Truck</option>
                                        <option value="bike">Bike</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                        <Car size={14} className="text-blue-500" />
                                        Model
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                        placeholder="e.g. Camry 2023"
                                        value={formData.model}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Hash size={14} className="text-blue-500" />
                                    Internal Vehicle #
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="V-001"
                                    value={formData.vehicleNumber}
                                    onChange={e => setFormData({ ...formData, vehicleNumber: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Hash size={14} className="text-blue-500" />
                                    Registration Number
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="DL-01-AB-1234"
                                    value={formData.registrationNumber}
                                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Driver & Photo */}
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 mb-2">Driver & Appearance</h3>
                            
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <User size={14} className="text-green-500" />
                                    Driver Name
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                    placeholder="Dave Mattew"
                                    value={formData.driverName}
                                    onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Phone size={14} className="text-green-500" />
                                    Driver Phone
                                </label>
                                <input
                                    type="tel"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                    placeholder="+91 98765 43210"
                                    value={formData.driverPhone}
                                    onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <ImageIcon size={14} className="text-green-500" />
                                    Vehicle Image URL
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all"
                                    placeholder="https://example.com/car.jpg"
                                    value={formData.vehicleImage}
                                    onChange={e => setFormData({ ...formData, vehicleImage: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 border-t border-gray-100 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-50 transition-all font-inter"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isCreating || isUpdating}
                            className="flex-1 px-6 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {(isCreating || isUpdating) ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : null}
                            {vehicle ? "Update Vehicle" : "Add Vehicle"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
