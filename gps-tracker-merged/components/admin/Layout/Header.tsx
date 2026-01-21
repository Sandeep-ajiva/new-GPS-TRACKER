"use client";
import React from "react";
import { Bell, Search } from "lucide-react";

export default function Header() {
    return (
        <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-64 z-40 px-6 flex items-center justify-between">
            <div className="w-[420px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    placeholder="Search everywhere..."
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 placeholder-slate-400 transition"
                />
            </div>

            <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
                </button>

                <div className="h-8 w-px bg-slate-200"></div>

                <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold text-slate-800">Admin User</p>
                        <p className="text-xs text-slate-500">admin@gps-tracker.com</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold border border-slate-900">
                        AD
                    </div>
                </div>
            </div>
        </header>
    );
}
