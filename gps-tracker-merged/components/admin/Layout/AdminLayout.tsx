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
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(96,165,250,0.10),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef2f7_100%)]">
            <Sidebar className="hidden md:flex" role={userRole} />
            {isSidebarOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
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
            <main className="min-h-screen pl-0 pt-20 md:pl-72">
                <div className="mx-auto max-w-[1600px] p-4 sm:p-6 xl:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
