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

export default function SettingsPage() {
    const [appName, setAppName] = useState("GPS Tracker Pro");
    const [supportEmail, setSupportEmail] = useState("superadmin@gps-tracker.com");
    const [maintenanceMessage, setMaintenanceMessage] = useState(
        "We are currently upgrading our systems. Please check back later."
    );
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailAlerts, setEmailAlerts] = useState(true);
    const [smsGateway, setSmsGateway] = useState(false);

    return (
        <div className="space-y-8 pb-10 max-w-5xl font-bold">
            <div>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">System</p>
                <h1 className="text-3xl font-black text-slate-100 tracking-tight">System Settings</h1>
                <p className="mt-1 text-sm text-slate-400">Global platform configuration and administrative controls.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-200">
                                <Globe size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-slate-100">Platform Core</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SettingInput label="App Name" value={appName} onChange={setAppName} />
                            <SettingInput label="Support Email" value={supportEmail} onChange={setSupportEmail} />
                            <div className="md:col-span-2">
                                <SettingInput label="Maintenance Message" value={maintenanceMessage} onChange={setMaintenanceMessage} isTextarea />
                            </div>
                        </div>
                    </section>

                    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="rounded-xl bg-amber-500/20 p-2.5 text-amber-200">
                                <Bell size={20} />
                            </div>
                            <h2 className="text-lg font-black uppercase tracking-widest text-slate-100">Notification Channels</h2>
                        </div>
                        <div className="space-y-4">
                            <ToggleItem label="Push Notifications" desc="Send real-time alerts to users and vendors." active={pushNotifications} onToggle={() => setPushNotifications((prev) => !prev)} />
                            <ToggleItem label="Email Alerts" desc="Send transactional and marketing emails." active={emailAlerts} onToggle={() => setEmailAlerts((prev) => !prev)} />
                            <ToggleItem label="SMS Gateway" desc="Enable OTP and order tracking via SMS." active={smsGateway} onToggle={() => setSmsGateway((prev) => !prev)} />
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <AlertCircle className="text-rose-300" size={24} />
                            <h3 className="text-lg font-black text-rose-100 leading-none">Critical Actions</h3>
                        </div>
                        <p className="mb-6 text-xs font-bold text-rose-200">Enabling maintenance mode will disable all user/vendor apps immediately.</p>
                        <button
                            onClick={() => {
                                const confirmAction = window.confirm("Enter maintenance mode?");
                                if (confirmAction) {
                                    toast.success("Maintenance mode enabled (demo)");
                                }
                            }}
                            className="w-full rounded-xl bg-rose-500/30 py-4 text-[11px] font-black uppercase tracking-widest text-rose-100 transition-all hover:bg-rose-500/40"
                        >
                            Enter Maintenance Mode
                        </button>
                    </div>

                    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-8 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-emerald-300" size={20} />
                            <h3 className="text-lg font-black uppercase tracking-widest leading-none text-slate-100">System Info</h3>
                        </div>
                        <div className="space-y-4 text-xs">
                            <div className="flex justify-between border-b border-slate-800/70 py-1">
                                <span className="text-slate-400">Version</span>
                                <span className="text-slate-100">v2.4.0-build.82</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/70 py-1">
                                <span className="text-slate-400">Environment</span>
                                <span className="text-slate-100">Production</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-800/70 py-1">
                                <span className="text-slate-400">Uptime</span>
                                <span className="text-slate-100">14 Days, 2h</span>
                            </div>
                        </div>
                        <button
                            onClick={() => toast.success("Cache cleared (demo)")}
                            className="mt-8 w-full rounded-xl border border-slate-800 bg-slate-950/70 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-emerald-500/20 hover:text-emerald-200"
                        >
                            Purge System Cache
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => {
                        setAppName("GPS Tracker Pro");
                        setSupportEmail("superadmin@gps-tracker.com");
                        setMaintenanceMessage("We are currently upgrading our systems. Please check back later.");
                        setPushNotifications(true);
                        setEmailAlerts(true);
                        setSmsGateway(false);
                        toast.message("Changes discarded");
                    }}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-900"
                >
                    Discard
                </button>
                <button
                    onClick={() => toast.success("Settings saved (demo)")}
                    className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/20 px-10 py-4 text-xs font-black uppercase tracking-widest text-emerald-200 transition-all hover:bg-emerald-500/30"
                >
                    <Save size={18} /> Save All Changes
                </button>
            </div>
        </div>
    );
}

function SettingInput({ label, value, onChange, isTextarea }: any) {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            {isTextarea ? (
                <textarea
                    className="h-28 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 pt-4 text-sm font-bold text-slate-100 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            ) : (
                <input
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-100 focus:ring-2 focus:ring-emerald-500/30 transition-all"
                    value={value}
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
        </div>
    );
}

function ToggleItem({ label, desc, active, onToggle }: any) {
    return (
        <div className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 transition-all hover:border-emerald-500/20">
            <div>
                <p className="text-sm font-black leading-none text-slate-100">{label}</p>
                <p className="mt-1 text-[10px] font-bold uppercase leading-none tracking-tighter text-slate-400">{desc}</p>
            </div>
            <button
                onClick={onToggle}
                className={`relative h-6 w-12 rounded-full transition-colors ${active ? 'bg-emerald-500/60' : 'bg-slate-700'}`}
            >
                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${active ? 'left-7' : 'left-1'}`}></div>
            </button>
        </div>
    );
}
