"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Upload, User, Mail, Building2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminUser, getRootOrganization, setAdminUser } from "@/lib/admin-dummy-data";
import { validators, validateForm } from "../Helpers/validators";
import { saveSecureItem, getSecureItem } from "../Helpers/encryptionHelper";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export default function ProfilePage() {
    const router = useRouter();

    // Use encryption helper to get data (simulated)
    const secureUser = getSecureItem("admin_profile");
    const adminUser = secureUser || getAdminUser();
    const rootOrg = getRootOrganization();

    const [formData, setFormData] = useState({
        name: adminUser.name,
        email: adminUser.email,
        organizationLogo: adminUser.organizationLogo || "",
    });
    const [errors, setErrors] = useState<any>({});
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Use validators
        const validationRules = {
            name: [validators.required],
            email: [validators.required, validators.email]
        };

        const { isValid, errors: validationErrors } = validateForm(formData, validationRules);

        if (!isValid) {
            setErrors(validationErrors);
            toast.error("Please fix form errors");
            return;
        }

        setIsSaving(true);

        setTimeout(() => {
            const updatedUser = {
                ...adminUser,
                name: formData.name,
                email: formData.email,
                organizationLogo: formData.organizationLogo,
            };

            setAdminUser(updatedUser);
            // Use encryption helper to save data (simulated)
            saveSecureItem("admin_profile", updatedUser);

            setIsSaving(false);
            setErrors({});
            toast.success("Profile updated successfully (Encrypted)");
        }, 500);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // In a real app, this would upload to a server
            // For dummy data, we'll just use a placeholder URL
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, organizationLogo: reader.result as string });
            };
            reader.readAsDataURL(file);
            toast.success("Logo uploaded (demo)");
        }
    };

    return (
        <div className="space-y-8 pb-10 max-w-4xl">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => router.back()}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    <ArrowLeft size={20} className="text-slate-600" />
                </button>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Profile Settings</h1>
                    <p className="text-gray-500 font-bold mt-1 text-sm">Update your admin profile and organization details.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Admin Details */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <User size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Admin Details</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <User size={14} className="text-blue-500" />
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className={`w-full px-4 py-3 bg-gray-50 border ${errors.name ? 'border-red-500' : 'border-none'} rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all`}
                            />
                            {errors.name && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Mail size={14} className="text-blue-500" />
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className={`w-full px-4 py-3 bg-gray-50 border ${errors.email ? 'border-red-500' : 'border-none'} rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all`}
                            />
                            {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                        </div>
                    </div>
                </div>

                {/* Organization Logo */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl">
                            <Building2 size={20} />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Organization Logo</h2>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center gap-6">
                            <div className="w-32 h-32 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300 overflow-hidden">
                                {formData.organizationLogo ? (
                                    <img
                                        src={formData.organizationLogo}
                                        alt="Organization Logo"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="text-center">
                                        <Building2 size={32} className="text-slate-400 mx-auto mb-2" />
                                        <p className="text-[10px] font-semibold text-slate-400">No Logo</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                    Upload Logo
                                </label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleLogoUpload}
                                    className="hidden"
                                    id="logo-upload"
                                />
                                <label
                                    htmlFor="logo-upload"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    <Upload size={16} />
                                    Choose File
                                </label>
                                <p className="text-xs text-slate-500 mt-2">Recommended: 512x512px, PNG or JPG</p>
                            </div>
                        </div>

                        {formData.organizationLogo && (
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, organizationLogo: "" })}
                                className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                            >
                                Remove Logo
                            </button>
                        )}
                    </div>
                </div>

                {/* Organization Info Display */}
                {rootOrg && (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                                <Building2 size={20} />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Organization Info</h2>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between py-2 border-b border-gray-50">
                                <span className="text-xs font-semibold text-gray-400">Organization Name</span>
                                <span className="text-sm font-bold text-gray-900">{rootOrg.name}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-50">
                                <span className="text-xs font-semibold text-gray-400">Email</span>
                                <span className="text-sm font-bold text-gray-900">{rootOrg.email}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-50">
                                <span className="text-xs font-semibold text-gray-400">Phone</span>
                                <span className="text-sm font-bold text-gray-900">{rootOrg.phone}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-xs font-semibold text-gray-400">Status</span>
                                <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${rootOrg.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                    }`}>
                                    {capitalizeFirstLetter(rootOrg.status)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-8 py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
