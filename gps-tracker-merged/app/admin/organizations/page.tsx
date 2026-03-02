"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Loader2, Eye, Filter } from "lucide-react";
import { toast } from "sonner";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";

// 🔐 ORG CONTEXT UPDATE
import { useOrgContext } from "@/hooks/useOrgContext";

import {
  useGetSubOrganizationsQuery,
  useCreateSubOrganizationWithManagerMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
} from "@/redux/api/organizationApi";

import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";

/* ================= TYPES ================= */

interface Organization {
  _id: string;
  name: string;
  organizationType: string;
  email: string;
  phone: string;
  address?: {
    addressLine?: string;
    city?: string;
    state?: string;
    country?: string;
    pincode?: string;
  };
  parentOrganizationId: string | null;
  status: "active" | "inactive";
}

/* ================= PAGE ================= */

export default function OrganizationsPage() {
  const router = useRouter();

  // 🔐 ORG CONTEXT UPDATE
  const { role , orgId, orgName, isSuperAdmin, isRootOrgAdmin } = useOrgContext();

  /* ---------------------------------------
     1️⃣ Fetch sub-organizations (NO parentId param)
  ---------------------------------------- */
  const { data: subOrgResponse, isLoading, error } =
    useGetSubOrganizationsQuery(undefined);

  const organizations: Organization[] = useMemo(
    () => subOrgResponse?.data || [],
    [subOrgResponse]
  );

  /* ---------------------------------------
     Mutations
  ---------------------------------------- */
  const [createSubOrganizationWithManager] =
    useCreateSubOrganizationWithManagerMutation();
  const [updateOrganization] = useUpdateOrganizationMutation();
  const [deleteOrganization] = useDeleteOrganizationMutation();

  /* ---------------------------------------
     UI State
  ---------------------------------------- */
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    name: "",
    type: "",
    status: "",
  });

  // 🔐 ORG CONTEXT UPDATE
  const canCreateOrg = isSuperAdmin || isRootOrgAdmin;
  const canEditOrg = isSuperAdmin || isRootOrgAdmin;
  const canDeleteOrg = isSuperAdmin || isRootOrgAdmin;

  const filteredOrganizations = useMemo(() => {
    const nameFilter = filters.name.trim().toLowerCase();
    return organizations.filter((org) => {
      if (nameFilter && !org.name.toLowerCase().includes(nameFilter)) {
        return false;
      }
      if (filters.type && org.organizationType !== filters.type) {
        return false;
      }
      if (filters.status && org.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [organizations, filters]);

  const formFields = useMemo(() => getFormFields(!!editingOrg), [editingOrg]);

  /* ---------------------------------------
     Modal handlers
    ---------------------------------------- */
  const openCreateModal = () => {
    setEditingOrg(null);
    setIsModalOpen(true);
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingOrg(null);
    setIsModalOpen(false);
  };

  /* ---------------------------------------
     Submit handler
  ---------------------------------------- */
  const handleSubmit = async (form: Record<string, any>) => {
    try {
      const address = {
        addressLine: form.addressLine,
        city: form.city,
        state: form.state,
        country: form.country,
        pincode: form.pincode,
      };

      if (editingOrg) {
        await updateOrganization({
          id: editingOrg._id,
          name: form.name,
          organizationType: form.organizationType,
          email: form.email,
          phone: form.phone,
          address,
        }).unwrap();

        toast.success("Organization updated successfully");
      } else {
        // 🔐 ORG CONTEXT UPDATE
        await createSubOrganizationWithManager({
          parentOrganizationId: orgId, // use current org as parent
          organizationData: {
            name: form.name,
            organizationType: form.organizationType,
            email: form.email,
            phone: form.phone,
            address,
            geo: {
              timezone: "Asia/Kolkata",
            },
            settings: {},
          },
          managerData: {
            firstName: form.managerFirstName,
            lastName: form.managerLastName,
            email: form.email,
            mobile: form.phone,
            password: form.managerPassword,
          },
        }).unwrap();

        toast.success("Sub-organization & manager created successfully");
      }
    } catch (err: any) {
      toast.error(err?.data?.message || "Operation failed");
      throw err; // re-throw so DynamicModal keeps the form open and shows inline error
    }
  };

  /* ---------------------------------------
     Delete
  ---------------------------------------- */
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this organization?")) return;
    try {
      await deleteOrganization(id).unwrap();
      toast.success("Organization deleted");
    } catch (err: any) {
      toast.error(err?.data?.message || "Delete failed");
    }
  };

  /* ---------------------------------------
     Table columns
  ---------------------------------------- */
  const columns = [
    { header: "Name", accessor: "name" },
    { header: "Type", accessor: "organizationType" },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone" },
    {
      header: "Status",
      accessor: (row: Organization) => (
        <span
          className={`px-2 py-1 rounded text-xs font-bold ${row.status === "active"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
            }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row: Organization) => (
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin?organizationId=${row._id}`)}
          >
            <Eye size={16} />
          </button>
          {canEditOrg && (
            <button onClick={() => openEditModal(row)}>
              <Edit size={16} />
            </button>
          )}
          {canDeleteOrg && (
            <button onClick={() => handleDelete(row._id)}>
              <Trash2 size={16} className="text-red-500" />
            </button>
          )}
        </div>
      ),
    },
  ];

  /* ---------------------------------------
     Loading / Error
  ---------------------------------------- */
  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-red-500">Failed to load data</div>;
  }

  /* ---------------------------------------
     UI
  ---------------------------------------- */
  return (
    <ApiErrorBoundary hasError={false}>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black">Sub Organizations</h1>
            {/* 🔐 ORG CONTEXT UPDATE */}
            <p className="text-sm text-slate-500">Parent: {orgName}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Filter size={14} /> Filter
            </button>
            {canCreateOrg && (
              <button
                onClick={openCreateModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} /> Add Sub Organization
              </button>
            )}
          </div>
        </div>

        <Table columns={columns} data={filteredOrganizations} />

        <DynamicModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={
            editingOrg
              ? "Edit Organization"
              : "Create Sub Organization & Manager"
          }
          fields={formFields}
          initialData={

            editingOrg
              ? {
                name: editingOrg.name,
                organizationType: editingOrg.organizationType,
                email: editingOrg.email,
                phone: editingOrg.phone,
                addressLine: editingOrg.address?.addressLine || "",
                city: editingOrg.address?.city || "",
                state: editingOrg.address?.state || "",
                country: editingOrg.address?.country || "",
                pincode: editingOrg.address?.pincode || "",
              }
              : undefined
          }
          onSubmit={handleSubmit}
          submitLabel={editingOrg ? "Update" : "Create"}
        />
      </div>
    </ApiErrorBoundary>
  );
}

/* ================= FORM FIELDS ================= */

function getFormFields(isEdit: boolean): FormField[] {
  const orgFields: FormField[] = [
    { name: "name", label: "Organization Name", type: "text", required: true },
    {
      name: "organizationType",
      label: "Type",
      type: "select",
      required: true,
      options: [
        { label: "Logistics", value: "logistics" },
        { label: "Transport", value: "transport" },
        { label: "School", value: "school" },
        { label: "Taxi", value: "taxi" },
        { label: "Fleet", value: "fleet" },
      ],
    },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel", required: true },
    { name: "addressLine", label: "Address Line", type: "text", required: true },
    { name: "city", label: "City", type: "text", required: true },
    { name: "state", label: "State", type: "text", required: true },
    { name: "country", label: "Country", type: "text", required: true },
    { name: "pincode", label: "Pincode", type: "text", required: true },
  ];

  if (isEdit) return orgFields;

  return [
    ...orgFields,
    {
      name: "managerFirstName",
      label: "Admin First Name",
      type: "text",
      required: true,
    },
    {
      name: "managerLastName",
      label: "Admin Last Name",
      type: "text",
      required: true,
    },
    {
      name: "managerPassword",
      label: "Admin Password",
      type: "password",
      required: true,
    },
  ];
}
