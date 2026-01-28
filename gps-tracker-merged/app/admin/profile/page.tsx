"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Building, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import Validator from "../Helpers/validators";
import { useGetMeQuery, useUpdateUserMutation } from "@/redux/api/usersApi";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export default function ProfilePage() {
    const { data: userData, isLoading, error } = useGetMeQuery(undefined, { refetchOnMountOrArgChange: true });
    const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();

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

    const Rules = {
        firstName: { required: true, errorMessage: "First Name is required." },
        lastName: { required: true, errorMessage: "Last Name is required." },
        email: { required: true, type: "email" as const, errorMessage: "Valid Email is required." },
        mobile: { required: true, errorMessage: "Mobile is required." },
    };

    const validator = new Validator(Rules);

    const handleBlur = async (name: string, value: any) => {
        const validationErrors = await validator.validateFormField(name, value);
        setErrors((prev: any) => ({
            ...prev,
            [name]: validationErrors[name]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const validationErrors = await validator.validate(formData);
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
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
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">My Profile</h1>
                    <p className="text-slate-500 text-sm font-bold mt-1">Manage your personal information and account settings.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* ID Card / Summary */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center">
                            <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-4 flex items-center justify-center text-slate-300">
                                <User size={48} />
                            </div>
                            <h2 className="text-lg font-black text-slate-900">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{user?.role}</p>

                            <div className="mt-6 flex justify-center">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user?.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {user?.status || "Unknown"}
                                </span>
                            </div>
                        </div>

                        {user?.organizationId && (
                            <div className="bg-white p-6 rounded-2xl text-slate-900 shadow-sm border border-slate-200">
                                <div className="flex items-center gap-3 mb-4 text-slate-500">
                                    <Building size={16} />
                                    <span className="text-xs font-black uppercase tracking-widest">Organization</span>
                                </div>
                                <h3 className="text-xl font-bold">{user.organizationId.name || "My Organization"}</h3>
                                <p className="text-xs text-slate-500 mt-2">{user.organizationId.email}</p>
                            </div>
                        )}
                    </div>

                    {/* Form */}
                    <div className="md:col-span-2">
                        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                            <h3 className="text-lg font-black text-slate-900 mb-6 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Basic Details
                            </h3>

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
                                <input
                                    type="text"
                                    className={`w-full px-4 py-3 rounded-xl bg-slate-50 border ${errors.mobile ? 'border-red-500' : 'border-transparent'} text-sm font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all outline-none`}
                                    value={formData.mobile}
                                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                                    onBlur={e => handleBlur("mobile", e.target.value)}
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
