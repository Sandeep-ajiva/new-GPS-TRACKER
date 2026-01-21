"use client";

import { useState } from "react";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2 } from "lucide-react";
import Table from "@/components/ui/Table";

export default function PermissionsPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const columns = [
        { header: "Module", accessor: "module" },
        { header: "Permission", accessor: "permission" },
        {
            header: "Actions", accessor: (row: any) => (
                <div className="flex gap-2">
                    <button className="text-blue-600 hover:text-blue-800"><Edit size={16} /></button>
                    <button className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                </div>
            )
        }
    ];

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900">Permissions</h1>
                        <p className="text-sm text-gray-500">Manage role-based access permissions.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-[#1877F2] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={16} /> Add Permission
                    </button>
                </div>

                <Table columns={columns} data={[]} loading={false} />
            </div>
        </ApiErrorBoundary>
    );
}