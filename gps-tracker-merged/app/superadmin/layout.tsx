"use client";
import React from "react";
import SuperAdminLayout from "@/components/superadmin/Layout/SuperAdminLayout";
import AuthGuard from "@/components/superadmin/Auth/AuthGuard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <AuthGuard>
            <SuperAdminLayout>{children}</SuperAdminLayout>
        </AuthGuard>
    );
}
