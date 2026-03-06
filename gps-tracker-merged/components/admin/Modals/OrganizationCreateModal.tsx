"use client";
import React, { useState } from "react";
import { Building2, Image, Lock, Mail, MapPin, Phone, X } from "lucide-react";
import { toast } from "sonner";
import LocationSelects from "@/components/common/LocationSelects";
import PhoneInputField from "@/components/common/PhoneInputField";

type OrganizationCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (payload: {
    name: string;
    organizationType: string;
    email: string;
    phone: string;
    address: {
      addressLine: string;
      city: string;
      state: string;
      country: string;
      pincode?: string;
    };
    firstName: string;
    lastName: string;
    password: string;
    logoUrl?: string;
  }) => void;
  variant?: "light" | "dark";
};

const splitOrgName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Org";
  const lastName = parts.slice(1).join(" ") || "Admin";
  return { firstName, lastName };
};

export default function OrganizationCreateModal({
  isOpen,
  onClose,
  onCreate,
  variant = "light",
}: OrganizationCreateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    organizationType: "logistics",
    email: "",
    phone: "",
    addressLine: "",
    country: "",
    state: "",
    city: "",
    pincode: "",
    password: "",
    logoUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { firstName, lastName } = splitOrgName(formData.name);

    try {
      if (onCreate) {
        await onCreate({
          name: formData.name,
          organizationType: formData.organizationType,
          email: formData.email,
          phone: formData.phone,
          address: {
            addressLine: formData.addressLine,
            city: formData.city,
            state: formData.state,
            country: formData.country,
            pincode: formData.pincode || undefined,
          },
          firstName,
          lastName,
          password: formData.password,
          logoUrl: formData.logoUrl || undefined,
        });
      }

      setFormData({
        name: "",
        organizationType: "logistics",
        email: "",
        phone: "",
        addressLine: "",
        country: "",
        state: "",
        city: "",
        pincode: "",
        password: "",
        logoUrl: "",
      });
      onClose();
    } catch (error: any) {
      console.error("Creation failed:", error);
      // Parent handle error with toast
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-100">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Add Sub-Organization
            </h2>
            <p className="text-sm font-medium text-slate-500">
              Add organization details and set admin access.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full transition-colors border border-transparent group hover:bg-white hover:border-slate-200"
            aria-label="Close"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <Building2 size={14} className="text-blue-500" />
                  Organization Name
                </label>
                <input
                  required
                  type="text"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. Ajiva Logistics"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <MapPin size={14} className="text-blue-500" />
                  Organization Type
                </label>
                <select
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  value={formData.organizationType}
                  onChange={(e) => setFormData({ ...formData, organizationType: e.target.value })}
                >
                  <option value="logistics">Logistics</option>
                  <option value="transport">Public Transport</option>
                  <option value="taxi">Taxi / Rental</option>
                  <option value="school">School / Campus</option>
                  <option value="fleet">Enterprise Fleet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <Mail size={14} className="text-blue-500" />
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="contact@organization.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <Phone size={14} className="text-blue-500" />
                  Phone Number
                </label>
                <PhoneInputField
                  value={formData.phone}
                  onChange={(val) => setFormData({ ...formData, phone: val })}
                  placeholder="Enter phone number"
                  required
                  variant={variant}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <MapPin size={14} className="text-blue-500" />
                  Address Line
                </label>
                <input
                  required
                  type="text"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="123 Business Way"
                  value={formData.addressLine}
                  onChange={(e) =>
                    setFormData({ ...formData, addressLine: e.target.value })
                  }
                />
              </div>

              <LocationSelects
                variant={variant}
                country={formData.country}
                state={formData.state}
                city={formData.city}
                onChange={(next) =>
                  setFormData({
                    ...formData,
                    ...next,
                  })
                }
              />

              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <MapPin size={14} className="text-blue-500" />
                  Pincode
                </label>
                <input
                  type="text"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="e.g. 110001"
                  value={formData.pincode}
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Lock size={14} className="text-blue-500" />
                  Password
                </label>
                <input
                  required
                  type="password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Set password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 text-slate-400">
                  <Image size={14} className="text-blue-500" />
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  className="w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all bg-slate-50 border border-slate-200 text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="https://logo.company.com/brand.svg"
                  value={formData.logoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, logoUrl: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"
            >
              {isSaving && (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Add Sub-Organization
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
