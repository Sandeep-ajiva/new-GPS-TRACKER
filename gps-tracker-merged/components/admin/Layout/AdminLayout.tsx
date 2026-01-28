"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar className="hidden md:flex" />
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        aria-label="Close sidebar"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <Sidebar
                        className="relative z-50"
                        showClose
                        onNavigate={() => setIsSidebarOpen(false)}
                        onClose={() => setIsSidebarOpen(false)}
                    />
                </div>
            )}
            <Header onOpenSidebar={() => setIsSidebarOpen(true)} />
            <main className="pt-16 min-h-screen pl-0 md:pl-64">
                <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
