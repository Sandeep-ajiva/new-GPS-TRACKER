"use client";
import React, { useState } from "react";
import {
    Settings,
    Bell,
    Shield,
    Globe,
    Save,
    AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import Validator from "../Helpers/validators";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";

export default function SettingsPage() {
    const [appName, setAppName] = useState("GPS Tracker");
    const [supportEmail, setSupportEmail] = useState("admin@gps-tracker.com");
    const [maintenanceMessage, setMaintenanceMessage] = useState(
        "We are currently upgrading our systems. Please check back later."
    );
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [smsGateway, setSmsGateway] = useState(false);
    const [errors, setErrors] = useState<any>({});

    const Rules = {
        appName: { required: true, type: "string" as const, errorMessage: "App Name is required." },
        supportEmail: { required: true, type: "string" as const, errorMessage: "Support Email is required." }
    };

    const validator = new Validator(Rules);

    const handleBlur = async (name: string, value: any) => {
        const validationErrors = await validator.validateFormField(name, value);
        setErrors((prev: any) => ({
            ...prev,
            [name]: validationErrors[name]
        }));
    };

    const handleSave = async () => {
        const formData = {
            appName,
            supportEmail
        };

        const validationErrors = await validator.validate(formData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Please fix settings errors");
            return;
        }

        setErrors({});
        toast.success("Settings saved successfully (Validated)");
    };

    return (
        <div className="space-y-8 pb-10 max-w-5xl font-bold">
            <div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Settings</h1>
                <p className="text-gray-500 font-bold mt-1 text-sm">Global platform configuration and administrative controls.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                                <Globe size={20} />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Platform Core</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SettingInput
                                label="App Name"
                                value={appName}
                                onChange={setAppName}
                                onBlur={(val: any) => handleBlur("appName", val)}
                                error={errors.appName}
                            />
                            <SettingInput
                                label="Support Email"
                                value={supportEmail}
                                onChange={setSupportEmail}
                                onBlur={(val: any) => handleBlur("supportEmail", val)}
                                error={errors.supportEmail}
                            />
                            <div className="md:col-span-2">
                                <SettingInput label="Maintenance Message" value={maintenanceMessage} onChange={setMaintenanceMessage} isTextarea />
                            </div>
                        </div>
                    </section>

                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                                <Bell size={20} />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 uppercase tracking-widest">Notification Channels</h2>
                        </div>
                        <div className="space-y-4">
                            <ToggleItem label="Push Notifications" desc="Send real-time alerts to users and vendors." active={pushNotifications} onToggle={() => setPushNotifications((prev) => !prev)} />
                            <ToggleItem label="Email Alerts" desc="Send transactional and marketing emails." active={emailAlerts} onToggle={() => setEmailAlerts((prev) => !prev)} />
                            <ToggleItem label="SMS Gateway" desc="Enable OTP and order tracking via SMS." active={smsGateway} onToggle={() => setSmsGateway((prev) => !prev)} />
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <div className="bg-red-50 p-8 rounded-2xl border border-red-100">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertCircle className="text-red-600" size={24} />
                            <h3 className="text-lg font-black text-red-900 leading-none">Critical Actions</h3>
                        </div>
                        <p className="text-xs text-red-700 font-bold mb-6">Enabling maintenance mode will disable all user/vendor apps immediately.</p>
                        <button
                            onClick={() => {
                                const confirmAction = window.confirm("Enter maintenance mode?");
                                if (confirmAction) {
                                    toast.success("Maintenance mode enabled (demo)");
                                }
                            }}
                            className="w-full py-4 bg-red-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                        >
                            Enter Maintenance Mode
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-green-600" size={20} />
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest leading-none">System Info</h3>
                        </div>
                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-400">Version</span>
                                <span className="text-gray-900">v2.4.0-build.82</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-400">Environment</span>
                                <span className="text-gray-900">Production</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-400">Uptime</span>
                                <span className="text-gray-900">14 Days, 2h</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-gray-50">
                                <span className="text-gray-400">Status</span>
                                <span className="text-green-600 font-bold px-2 py-0.5 rounded bg-green-50">{capitalizeFirstLetter("online")}</span>
                            </div>
                        </div>
                        <button
                            onClick={() => toast.success("Cache cleared (demo)")}
                            className="w-full mt-8 py-3 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1877F2] hover:text-white transition-all"
                        >
                            Purge System Cache
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => {
                        setAppName("GPS Tracker");
                        setSupportEmail("admin@gps-tracker.com");
                        setMaintenanceMessage("We are currently upgrading our systems. Please check back later.");
                        setPushNotifications(true);
                        setEmailAlerts(true);
                        setSmsGateway(false);
                        setErrors({});
                        toast.message("Changes discarded");
                    }}
                    className="px-8 py-4 bg-white border border-gray-100 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all"
                >
                    Discard
                </button>
                <button
                    onClick={handleSave}
                    className="px-10 py-4 bg-[#1877F2] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                    <Save size={18} /> Save All Changes
                </button>
            </div>
        </div>
    );
}

function SettingInput({ label, value, onChange, onBlur, isTextarea, error }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</label>
            {isTextarea ? (
                <textarea
                    className={`w-full px-4 py-3 bg-gray-50 border ${error ? 'border-red-500' : 'border-none'} rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 h-28 pt-4 transition-all`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={(event) => onBlur && onBlur(event.target.value)}
                />
            ) : (
                <input
                    className={`w-full px-4 py-3 bg-gray-50 border ${error ? 'border-red-500' : 'border-none'} rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all`}
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={(event) => onBlur && onBlur(event.target.value)}
                />
            )}
            {error && <p className="text-red-500 text-[10px] mt-1 font-bold">{error}</p>}
        </div>
    );
}

function ToggleItem({ label, desc, active, onToggle }: any) {
    return (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 transition-all">
            <div>
                <p className="text-sm font-black text-gray-900 leading-none">{label}</p>
                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase leading-none tracking-tighter">{desc}</p>
            </div>
            <button
                onClick={onToggle}
                className={`w-12 h-6 rounded-full relative transition-colors ${active ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`}></div>
            </button>
        </div>
    );
}
