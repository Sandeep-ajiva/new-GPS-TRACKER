"use client";
import React from "react";
import Sidebar from "./Sidebar";
import Header from "@/components/superadmin/Layout/Header";

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

export default function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar />
      <Header />
      <main className="pl-64 pt-16 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto text-slate-100">{children}</div>
      </main>
    </div>
  );
}
