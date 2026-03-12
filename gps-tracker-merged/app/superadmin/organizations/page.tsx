"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Table from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { ExternalLink, Plus, Edit, Trash2, Eye, Building2, Phone, Mail, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";
import OrganizationCreateModal from "@/components/admin/Modals/OrganizationCreateModal";
import LocationSelects from "@/components/common/LocationSelects";
import PhoneInputField from "@/components/common/PhoneInputField";

import {
    useGetOrganizationsQuery,
    useCreateOrganizationMutation,
    useUpdateOrganizationMutation,
    useDeleteOrganizationMutation,
} from "@/redux/api/organizationApi";

import { usePopups } from "../Helpers/PopupContext";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";

export interface Organization {
    _id: string;
    name: string;
    email: string;
    phone: string;
    address?: {
        addressLine?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
    };
    status: "active" | "inactive";
    adminUser?: string;
    geo?: {
        lat?: number;
        lng?: number;
    };
}

export default function OrganizationsPage() {
    const router = useRouter();
    const { openPopup, closePopup, isPopupOpen, getPopupData } = usePopups();
    const searchParams = useSearchParams();
    const searchQueryParam = searchParams.get("search");

    const [page, setPage] = useState(1);
    const LIMIT = 10;
    const [showFilters, setShowFilters] = useState(false);

    const [filters, setFilters] = useState({
        name: searchQueryParam || "",
        email: "",
        phone: "",
        status: "",
        city: "",
        state: "",
        country: "",
    });

    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

    // API Hooks
    const { data: orgsData, isLoading: isOrgLoading, refetch: refetchOrgs } = useGetOrganizationsQuery(
        { page: page - 1, limit: LIMIT },
        {
            refetchOnMountOrArgChange: true,
        },
    );

    const [createOrg] = useCreateOrganizationMutation();
    const [updateOrg] = useUpdateOrganizationMutation();
    const [deleteOrg] = useDeleteOrganizationMutation();

    // Safe Response Mapping
    const displayOrgs = orgsData?.organizations || orgsData?.data || orgsData?.docs || [];
    const orgTotal = (orgsData as any)?.pagination?.totalrecords || (orgsData as any)?.total || displayOrgs.length;
    
    const isLoading = isOrgLoading;

    // Filter organizations based on search and filters
    const filteredOrgs = useMemo(() => {
        let filtered = displayOrgs;

        // Search filter
        if (filters.name) {
            const searchLower = filters.name.toLowerCase();
            filtered = filtered.filter((org: any) => 
                org.name?.toLowerCase().includes(searchLower) ||
                org.email?.toLowerCase().includes(searchLower) ||
                org.phone?.toLowerCase().includes(searchLower)
            );
        }

        // Status filter
        if (filters.status) {
            filtered = filtered.filter((org: any) => org.status === filters.status);
        }

        // City filter
        if (filters.city) {
            filtered = filtered.filter((org: any) => {
                const city = typeof org.address === 'object' ? org.address?.city : "";
                return city?.toLowerCase().includes(filters.city.toLowerCase());
            });
        }

        return filtered;
    }, [displayOrgs, filters]);

    // Pagination
    const totalPages = Math.ceil(filteredOrgs.length / LIMIT);
    const paginatedOrgs = filteredOrgs.slice((page - 1) * LIMIT, page * LIMIT);

    // Form field definitions
    const orgFormFields: FormField[] = [
        {
            name: "name",
            label: "Organization Name",
            type: "text",
            placeholder: "Enter organization name",
            required: true,
            icon: <Building2 size={16} />,
        },
        {
            name: "organizationType",
            label: "Organization Type",
            type: "select",
            required: true,
            options: [
                { label: "Logistics", value: "logistics" },
                { label: "Public Transport", value: "transport" },
                { label: "Taxi / Rental", value: "taxi" },
                { label: "School / Campus", value: "school" },
                { label: "Enterprise Fleet", value: "fleet" },
            ],
        },
        {
            name: "email",
            label: "Email Address",
            type: "email",
            placeholder: "Enter email address",
            required: true,
            icon: <Mail size={16} />,
        },
        {
            name: "phone",
            label: "Phone Number",
            type: "tel",
            placeholder: "Enter phone number",
            required: true,
            icon: <Phone size={16} />,
        },
        {
            name: "addressLine",
            label: "Address Line",
            type: "text",
            placeholder: "Enter street address",
            required: true,
        },
        {
            name: "country",
            label: "Country",
            type: "select",
            required: true,
            options: [], 
        },
        {
            name: "state",
            label: "State",
            type: "select",
            required: true,
            options: [], 
        },
        {
            name: "city",
            label: "City",
            type: "select",
            required: true,
            options: [], 
        },
        {
            name: "pincode",
            label: "Pincode",
            type: "text",
            placeholder: "Enter pincode",
        },
        ...(!editingOrg ? [{
            name: "password",
            label: "Admin Password",
            type: "password",
            placeholder: "Set initial admin password",
            required: true,
            icon: <Lock size={16} />,
        } as FormField] : []),
        {
            name: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
                { label: "Active", value: "active" },
                { label: "Inactive", value: "inactive" },
            ],
        },
    ];

    // Zod schema for validation
    const orgSchema = z.object({
        name: z.string().min(1, "Organization name is required"),
        organizationType: z.string().min(1, "Organization type is required"),
        email: z.string().email("Valid email is required"),
        phone: z.string().min(1, "Phone number is required"),
        addressLine: z.string().min(1, "Address line is required"),
        country: z.string().min(1, "Country is required"),
        state: z.string().min(1, "State is required"),
        city: z.string().min(1, "City is required"),
        pincode: z.string().optional(),
        password: editingOrg ? z.string().optional() : z.string().min(6, "Password must be at least 6 characters"),
        status: z.enum(["active", "inactive"]),
    });

    // Form submission handler
    const handleOrgSubmit = async (data: Record<string, any>) => {
        try {
            const payload = {
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: {
                    addressLine: data.addressLine,
                    city: data.city,
                    state: data.state,
                    country: data.country,
                    pincode: data.pincode || undefined,
                },
                status: data.status,
            };

            if (editingOrg) {
                await updateOrg({ id: editingOrg._id, body: payload }).unwrap();
                toast.success("Organization updated successfully");
            } else {
                // Split name for admin user
                const nameParts = data.name.trim().split(/\s+/);
                const firstName = nameParts[0] || "Admin";
                const lastName = nameParts.slice(1).join(" ") || "User";

                await createOrg({
                    ...payload,
                    organizationType: data.organizationType,
                    firstName,
                    lastName,
                    password: data.password,
                    settings: { speedLimit: 80 },
                }).unwrap();
                toast.success("Organization and Admin created successfully");
            }
            
            closePopup("orgModal");
            refetchOrgs();
        } catch (error: any) {
            toast.error(error.data?.message || "Failed to save organization");
        }
    };

    // Modal handlers
    const openCreateModal = () => {
        setEditingOrg(null);
        openPopup("orgModal");
    };

    const openEditModal = (org: Organization) => {
        setEditingOrg(org);
        const normalizedAddress =
            typeof org?.address === "string"
                ? { addressLine: org.address, city: "", state: "", country: "", pincode: "" }
                : (org?.address || { addressLine: "", city: "", state: "", country: "", pincode: "" });
        
        openPopup("orgModal", {
            name: org.name,
            email: org.email,
            phone: org.phone,
            addressLine: normalizedAddress.addressLine || "",
            country: normalizedAddress.country || "",
            state: normalizedAddress.state || "",
            city: normalizedAddress.city || "",
            pincode: normalizedAddress.pincode || "",
            status: org.status,
        });
    };

    // Delete handler
    const handleDelete = async (org: Organization) => {
        if (confirm(`Are you sure you want to delete ${org.name}?`)) {
            try {
                await deleteOrg(org._id).unwrap();
                toast.success("Organization deleted successfully");
                refetchOrgs();
            } catch (error: any) {
                toast.error(error.data?.message || "Failed to delete organization");
            }
        }
    };

    // Table columns definition
    const columns = [
        { header: "Name", accessor: "name" },
        { header: "Email", accessor: "email" },
        { header: "Phone", accessor: "phone" },
        {
            header: "City",
            accessor: (row: any) => {
                if (typeof row.address === 'object') {
                    return row.address?.city || "Not specified";
                }
                return "Not specified";
            },
        },
        {
            header: "Status",
            accessor: (row: any) => (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
                    row.status === "active"
                        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-200"
                        : "border-rose-500/30 bg-rose-500/20 text-rose-200"
                }`}>
                    {row.status}
                </span>
            ),
        },
        {
            header: "Actions",
            accessor: (row: any) => (
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push(`/superadmin/organizations/${row._id}`)}
                        className="text-emerald-200 hover:text-emerald-100 transition-colors"
                        title="View details"
                    >
                        <Eye size={16} />
                    </button>
                    <button
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                sessionStorage.setItem("adminSelectedOrgId", row._id);
                                sessionStorage.setItem("adminFromSuperadmin", "true");
                            }
                            router.push("/admin");
                        }}
                        className="text-sky-200 hover:text-sky-100 transition-colors"
                        title="Access as admin"
                    >
                        <ExternalLink size={16} />
                    </button>
                    <button
                        onClick={() => openEditModal(row)}
                        className="text-slate-200 hover:text-white transition-colors"
                        title="Edit organization"
                    >
                        <Edit size={16} />
                    </button>
                    <button
                        onClick={() => handleDelete(row)}
                        className="text-rose-300 hover:text-rose-200 transition-colors"
                        title="Delete organization"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <ApiErrorBoundary hasError={false}>
            <div className="space-y-8 pb-10">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">
                            Organization Management
                        </p>
                        <h1 className="text-3xl font-black text-slate-100 tracking-tight">
                            Organizations
                        </h1>
                        <p className="text-slate-400 font-bold mt-1">
                            Manage client organizations and their configurations.
                        </p>
                    </div>

                    <button
                        onClick={openCreateModal}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30 flex items-center gap-2"
                    >
                        <Plus size={16} />
                        Add Organization
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap gap-2">
                        {["all", "active", "inactive"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilters({ ...filters, status: status === "all" ? "" : status })}
                                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                                    (status === "all" && !filters.status) || filters.status === status
                                        ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                                        : "border-slate-800/80 bg-slate-950/60 text-slate-400 hover:text-slate-200"
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Search by name, email, phone..."
                            value={filters.name}
                            onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                            className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                        <input
                            type="text"
                            placeholder="Filter by city"
                            value={filters.city}
                            onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                            className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm">
                    <Table
                        columns={columns}
                        data={paginatedOrgs}
                        loading={isLoading}
                        variant="dark"
                    />
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-800/80">
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                onPageChange={setPage}
                            />
                        </div>
                    )}
                </div>

                {/* Dynamic Modal */}
                <DynamicModal
                    isOpen={isPopupOpen("orgModal")}
                    onClose={() => closePopup("orgModal")}
                    title={editingOrg ? "Edit Organization" : "Create New Organization"}
                    description={
                        editingOrg
                            ? "Update organization information and settings."
                            : "Add a new organization to the system with proper configuration."
                    }
                    fields={orgFormFields}
                    initialData={isPopupOpen("orgModal") ? (getPopupData("orgModal") || {}) : {}}
                    schema={orgSchema}
                    onSubmit={handleOrgSubmit}
                    submitLabel={editingOrg ? "Update Organization" : "Create Organization"}
                    variant="dark"
                />
            </div>
        </ApiErrorBoundary>
    );
}
