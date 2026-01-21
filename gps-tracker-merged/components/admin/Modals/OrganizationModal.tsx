"use client";
import React, { useState } from "react";
import { X, Building2, Mail, Phone, MapPin, User } from "lucide-react";
import { Organization, IApiError } from "@/types";
import { useCreateOrganizationMutation, useUpdateOrganizationMutation } from "@/redux/api/organizationApi";
import { toast } from "sonner";

interface OrganizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    organization?: Organization | null;
}

export default function OrganizationModal({ isOpen, onClose, organization }: OrganizationModalProps) {
    const [createOrg, { isLoading: isCreating }] = useCreateOrganizationMutation();
    const [updateOrg, { isLoading: isUpdating }] = useUpdateOrganizationMutation();

    const [formData, setFormData] = useState({
        name: organization?.name || "",
        email: organization?.email || "",
        phone: organization?.phone || "",
        address: organization?.address || "",
        contactPerson: organization?.contactPerson || "",
        logo: organization?.logo || ""
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (organization) {
                await updateOrg({ id: organization._id, ...formData }).unwrap();
                toast.success("Organization updated successfully");
            } else {
                await createOrg(formData).unwrap();
                toast.success("Organization created successfully");
            }
            onClose();
        } catch (error: unknown) {
            const apiError = error as IApiError;
            toast.error(apiError?.data?.message || "Failed to save organization");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">{organization ? "Edit Organization" : "Create New Organization"}</h2>
                        <p className="text-sm text-gray-500 font-medium">Enter organization details below</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200 group">
                        <X size={20} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Building2 size={14} className="text-blue-500" />
                                    Organization Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="e.g. Ajiva Logistics"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Mail size={14} className="text-blue-500" />
                                    Email Address
                                </label>
                                <input
                                    required
                                    type="email"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="contact@organization.com"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <Phone size={14} className="text-blue-500" />
                                    Phone Number
                                </label>
                                <input
                                    required
                                    type="tel"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="+1 (234) 567-8900"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <User size={14} className="text-blue-500" />
                                    Contact Person
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    placeholder="John Doe"
                                    value={formData.contactPerson}
                                    onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                                    <MapPin size={14} className="text-blue-500" />
                                    Address
                                </label>
                                <textarea
                                    required
                                    rows={4}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
                                    placeholder="123 Business Way, City, Country"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 border-t border-gray-100 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
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
                            {organization ? "Update Organization" : "Create Organization"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
