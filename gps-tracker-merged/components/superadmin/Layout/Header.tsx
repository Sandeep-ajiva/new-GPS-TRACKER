"use client";
import React from "react";
import { Bell, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 fixed top-0 right-0 left-64 z-40 px-6 flex items-center justify-between text-white">
      <div className="w-[420px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search control plane..."
          className="w-full pl-10 pr-4 py-2 border border-slate-800 bg-slate-950 rounded-xl text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 placeholder-slate-500 transition"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-300 hover:bg-slate-800 rounded-full transition">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-400 rounded-full border border-slate-900"></span>
        </button>

        <div className="h-8 w-px bg-slate-800"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">Super Admin</p>
            <p className="text-xs text-slate-400">root@gps-tracker.com</p>
          </div>
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 font-bold border border-emerald-400">
            SA
          </div>
        </div>
      </div>
    </header>
  );
}
