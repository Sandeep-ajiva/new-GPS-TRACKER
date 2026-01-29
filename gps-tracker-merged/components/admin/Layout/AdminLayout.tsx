"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";

interface AdminLayoutProps {
    children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        const role = getSecureItem("userRole");
        setUserRole(role);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50">
            <Sidebar className="hidden md:flex" role={userRole} />
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
                        role={userRole}
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
