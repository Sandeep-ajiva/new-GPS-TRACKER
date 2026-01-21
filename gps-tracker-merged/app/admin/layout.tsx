"use client";
import React from "react";
import AdminLayout from "@/components/admin/Layout/AdminLayout";
import AuthGuard from "@/components/admin/Auth/AuthGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <AdminLayout>{children}</AdminLayout>
        </AuthGuard>
    );
}
