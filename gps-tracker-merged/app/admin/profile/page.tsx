"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Building, Save, Loader2, Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { useGetMeQuery, useUpdateUserMutation } from "@/redux/api/usersApi";
import { useUpdateOrganizationMutation } from "@/redux/api/organizationApi";
import { z } from "zod";
import PhoneInputField from "@/components/common/PhoneInputField";

export default function ProfilePage() {
    const { data: userData, isLoading, error } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
    const [updateOrganization, { isLoading: isUpdatingOrg }] = useUpdateOrganizationMutation();

    const user = userData?.data;

    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        mobile: "",
    });

    const [errors, setErrors] = useState<any>({});

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                email: user.email || "",
                mobile: user.mobile || "",
            });
        }
    }, [user]);

    const profileSchema = z.object({
        firstName: z.string().min(1, "First Name is required."),
        lastName: z.string().min(1, "Last Name is required."),
        email: z.string().email("Valid Email is required."),
        mobile: z.string().regex(/^\+?[1-9]\d{7,14}$/, "Enter valid mobile with country code"),
    });

    const handleBlur = (name: string, value: any) => {
        const fieldSchema = profileSchema.pick({ [name]: true } as any);
        const result = fieldSchema.safeParse({ [name]: value });
        setErrors((prev: any) => ({
            ...prev,
            [name]: result.success ? "" : result.error.issues[0]?.message || "Invalid value",
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const parsed = profileSchema.safeParse(formData);
        if (!parsed.success) {
            const nextErrors: any = {};
            parsed.error.issues.forEach((issue) => {
                const key = issue.path[0] as string;
                if (!nextErrors[key]) nextErrors[key] = issue.message;
            });
            setErrors(nextErrors);
            toast.error("Please fix profile errors");
            return;
        }

        try {
            // Only update allowed fields
            const payload = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                mobile: formData.mobile,
                email: formData.email, // backend allows email update? check controller
                status: user.status
            };

            await updateUser({ id: user._id, ...payload }).unwrap();
            toast.success("Profile updated successfully");
        } catch (err: any) {
            toast.error(err?.data?.message || "Update failed");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="animate-spin text-slate-500" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-red-500 font-bold text-center bg-red-50 rounded-xl border border-red-100">
                Failed to load profile.
            </div>
        );
    }

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="max-w-4xl space-y-8 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar: Branding & Summary */}
                    <div className="md:col-span-1 space-y-6">
                        {user?.organizationId && (
                            <div className="bg-white p-6 rounded-2xl text-slate-900 shadow-sm border border-slate-200">
                                <div className="flex items-center gap-3 mb-4 text-slate-500">
                                    <Building size={16} />
                                    <span className="text-xs font-black uppercase tracking-widest">Organization Branding</span>
                                </div>

                                {/* Logo Management */}
                                <div className="mb-6 flex flex-col items-center">
                                    <div className="relative group">
                                        <div className="w-40 h-40 rounded-2xl bg-slate-50 border-2 border-slate-100 overflow-hidden flex items-center justify-center relative shadow-inner">
                                            {user.organizationId.logo ? (
                                                <img
                                                    src={`http://localhost:5000${user.organizationId.logo}`}
                                                    alt="Organization Logo"
                                                    className="w-full h-full object-contain p-3"
                                                />
                                            ) : (
                                                <div className="text-slate-200">
                                                    <Building size={48} />
                                                </div>
                                            )}

                                            {/* Restrict Editing to Main Admin (No parentOrganizationId or SuperAdmin) */}
                                            {(!user.organizationId.parentOrganizationId || user.role === 'superadmin') ? (
                                                <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (!file) return;
                                                            const formData = new FormData();
                                                            formData.append('logo', file);
                                                            try {
                                                                await updateOrganization({ id: user.organizationId._id, body: formData }).unwrap();
                                                                toast.success("Logo updated successfully");
                                                            } catch (err: any) {
                                                                toast.error(err?.data?.message || "Logo update failed");
                                                            }
                                                        }}
                                                    />
                                                    <Camera className="text-white" size={32} />
                                                </label>
                                            ) : null}
                                        </div>
                                        <div className="mt-4 text-center">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                {(!user.organizationId.parentOrganizationId || user.role === 'superadmin') ? "Change Logo" : "Official Logo"}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-center">{user.organizationId.name}</h3>
                            </div>
                        )}

                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <h2 className="text-lg font-black text-slate-900">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.role}</p>

                            <div className="mt-4 flex justify-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user?.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {user?.status || "Unknown"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">First Name</label>
                                    <input
                                        type="text"
                                        className={`w-full px-4 py-3 rounded-xl bg-slate-50 border ${errors.firstName ? 'border-red-500' : 'border-transparent'} text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all outline-none`}
                                        value={formData.firstName}
                                        onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                        onBlur={e => handleBlur("firstName", e.target.value)}
                                    />
                                    {errors.firstName && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.firstName}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        className={`w-full px-4 py-3 rounded-xl bg-slate-50 border ${errors.lastName ? 'border-red-500' : 'border-transparent'} text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all outline-none`}
                                        value={formData.lastName}
                                        onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                        onBlur={e => handleBlur("lastName", e.target.value)}
                                    />
                                    {errors.lastName && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.lastName}</p>}
                                </div>
                            </div>

                            <div>
                                <label className="flex text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 icon-label items-center gap-2"><Mail size={12} /> Email Address</label>
                                <input
                                    type="email"
                                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 border ${errors.email ? 'border-red-500' : 'border-transparent'} text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all outline-none`}
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    onBlur={e => handleBlur("email", e.target.value)}
                                // Should we disable email edit? Usually yes for identity. But Requirement doesn't specify. Left editable.
                                />
                                {errors.email && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="flex text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 icon-label items-center gap-2"><Phone size={12} /> Mobile Number</label>
                                <PhoneInputField
                                    value={formData.mobile}
                                    onChange={(val) => setFormData({ ...formData, mobile: val })}
                                    placeholder="Enter phone number"
                                    required
                                />
                                {errors.mobile && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.mobile}</p>}
                            </div>

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="w-full py-4 bg-[#1877F2] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex justify-center items-center gap-2 disabled:opacity-70"
                                >
                                    {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </ApiErrorBoundary>
    );
}
