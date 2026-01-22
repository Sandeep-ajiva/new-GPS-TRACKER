"use client";
import React, { useState } from "react";
import { Building2, Image, Lock, Mail, MapPin, Phone, X } from "lucide-react";
import { toast } from "sonner";

type OrganizationCreateModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreate?: (payload: {
    name: string;
    orgType: string;
    email: string;
    phone: string;
    address: string;
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
  const isDark = variant === "dark";
  const [formData, setFormData] = useState({
    name: "",
    orgType: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    logoUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const { firstName, lastName } = splitOrgName(formData.name);
    setTimeout(() => {
      setIsSaving(false);
      toast.success(`Organization created for ${firstName} ${lastName} (demo)`);
      onCreate?.({
        name: formData.name,
        orgType: formData.orgType,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        password: formData.password,
        logoUrl: formData.logoUrl || undefined,
      });
      setFormData({
        name: "",
        orgType: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        logoUrl: "",
      });
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-100 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className={`${isDark ? "bg-slate-900/95 border border-slate-800 text-slate-100" : "bg-white"} rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200`}>
        <div className={`flex items-center justify-between p-6 ${isDark ? "border-b border-slate-800 bg-slate-950/60" : "border-b border-gray-100 bg-gray-50/50"}`}>
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Add Sub-Organization
            </h2>
            <p className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>
              Add organization details and set admin access.
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors border border-transparent group ${isDark ? "hover:bg-slate-900 hover:border-slate-700" : "hover:bg-white hover:border-gray-200"}`}
            aria-label="Close"
          >
            <X size={20} className={`${isDark ? "text-slate-500 group-hover:text-slate-200" : "text-gray-400 group-hover:text-gray-600"}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  <Building2 size={14} className={`${isDark ? "text-emerald-300" : "text-blue-500"}`} />
                  Organization Name
                </label>
                <input
                  required
                  type="text"
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="e.g. Ajiva Logistics"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  <MapPin size={14} className={`${isDark ? "text-emerald-300" : "text-blue-500"}`} />
                  Organization Type
                </label>
                <select
                  required
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  value={formData.orgType}
                  onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                >
                  <option value="">Select type</option>
                  <option value="logistics">Logistics</option>
                  <option value="public-transport">Public Transport</option>
                  <option value="rental">Rental Fleet</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  <Mail size={14} className={`${isDark ? "text-emerald-300" : "text-blue-500"}`} />
                  Email Address
                </label>
                <input
                  required
                  type="email"
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="contact@organization.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  <Phone size={14} className={`${isDark ? "text-emerald-300" : "text-blue-500"}`} />
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="+1 (234) 567-8900"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  <MapPin size={14} className={`${isDark ? "text-emerald-300" : "text-blue-500"}`} />
                  Address
                </label>
                <textarea
                  required
                  rows={4}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all resize-none ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="123 Business Way, City, Country"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                  <Lock size={14} className="text-blue-500" />
                  Password
                </label>
                <input
                  required
                  type="password"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Set password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <div>
                <label className={`block text-xs font-black uppercase tracking-widest mb-1.5 flex items-center gap-2 ${isDark ? "text-slate-400" : "text-gray-400"}`}>
                  <Image size={14} className={`${isDark ? "text-emerald-300" : "text-blue-500"}`} />
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  className={`w-full rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-100 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500" : "bg-gray-50 border border-gray-200 text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"}`}
                  placeholder="https://logo.company.com/brand.svg"
                  value={formData.logoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, logoUrl: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className={`flex gap-4 mt-8 pt-6 ${isDark ? "border-t border-slate-800" : "border-t border-gray-100"}`}>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${isDark ? "bg-slate-950/70 border border-slate-800 text-slate-300 hover:bg-slate-900" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 px-6 py-3.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isDark ? "bg-emerald-500/30 text-emerald-100 hover:bg-emerald-500/40" : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200"}`}
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
