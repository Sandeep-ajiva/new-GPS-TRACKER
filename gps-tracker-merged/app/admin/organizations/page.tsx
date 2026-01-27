"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useGetOrganizationsQuery,
  useGetSubOrganizationsQuery,
  useCreateOrganizationMutation,
  useCreateSubOrgWithManagerMutation,
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
  };
  parentOrganizationId: string | null;
  status: "active" | "inactive";
}

/* ================= PAGE ================= */

export default function OrganizationsPage() {
  /* ---------------------------------------
     STEP 1: Fetch ALL organizations
     (Used ONLY to detect parent org)
  ---------------------------------------- */
  const { data: allOrgResponse, isLoading: loadingAll } =
    useGetOrganizationsQuery(undefined);

  const allOrganizations: Organization[] = useMemo(
    () => allOrgResponse?.data || [],
    [allOrgResponse],
  );

  /* ---------------------------------------
     STEP 2: Find PARENT organization
     (parentOrganizationId === null)
  ---------------------------------------- */
  const parentOrg = useMemo(
    () => allOrganizations.find((o) => o.parentOrganizationId === null),
    [allOrganizations],
  );

  const parentOrgId = parentOrg?._id;

  /* ---------------------------------------
     STEP 3: Fetch SUB-ORGANIZATIONS
     (ONLY when parentId exists)
  ---------------------------------------- */
  const {
    data: subOrgResponse,
    isLoading,
    error,
  } = useGetSubOrganizationsQuery(parentOrgId!, {
    skip: !parentOrgId,
  });

  const organizations: Organization[] = useMemo(
    () => subOrgResponse?.data || [],
    [subOrgResponse],
  );

  /* ---------------------------------------
     Mutations
  ---------------------------------------- */
  const [createOrganization] = useCreateOrganizationMutation();
  const [createSubOrgWithManager] = useCreateSubOrgWithManagerMutation();
  const [updateOrganization] = useUpdateOrganizationMutation();
  const [deleteOrganization] = useDeleteOrganizationMutation();

  /* ---------------------------------------
     UI State
  ---------------------------------------- */
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /* ---------------------------------------
     Handlers
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

  const handleSubmit = async (form: Record<string, any>) => {
    try {
      if (editingOrg) {
        await updateOrganization({
          id: editingOrg._id,
          ...form,
          address: { addressLine: form.address },
        }).unwrap();
        toast.success("Organization updated");
      } else {
        await createSubOrgWithManager({
          parentOrganizationId: parentOrgId,
          organizationData: {
            name: form.name,
            organizationType: form.organizationType,
            email: form.email,
            phone: form.phone,
            address: { addressLine: form.address },
            status: form.status,
          },
          managerData: {
            firstName: form.managerFirstName,
            lastName: form.managerLastName,
            email: form.managerEmail,
            mobile: form.managerMobile,
            passwordHash: form.managerPassword,
          },
        }).unwrap();
        toast.success("Sub-organization created");
      }
      closeModal();
    } catch (err: any) {
      toast.error(err?.data?.message || "Operation failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this organization?")) return;
    await deleteOrganization(id).unwrap();
    toast.success("Organization deleted");
  };

  /* ---------------------------------------
     Table Columns
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
          className={`px-2 py-1 rounded text-xs font-bold ${
            row.status === "active"
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
          <button onClick={() => openEditModal(row)}>
            <Edit size={16} />
          </button>
          <button onClick={() => handleDelete(row._id)}>
            <Trash2 size={16} className="text-red-500" />
          </button>
        </div>
      ),
    },
  ];

  /* ---------------------------------------
     Loading / Error
  ---------------------------------------- */
  if (loadingAll || isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!parentOrgId) {
    return (
      <div className="p-6 text-red-500">
        Parent organization not found. Please create a main organization first.
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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black">Sub Organizations</h1>
            <p className="text-sm text-slate-500">Parent: {parentOrg?.name}</p>
          </div>
          <button
            onClick={openCreateModal}
            className="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2"
          >
            <Plus size={14} /> Add Sub Organization
          </button>
        </div>

        <Table columns={columns} data={organizations} loading={isLoading} />

        <DynamicModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingOrg ? "Edit Organization" : "Create Sub Organization"}
          fields={getFormFields(!!editingOrg)}
          initialData={editingOrg || undefined}
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
    { name: "address", label: "Address", type: "textarea" },
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

  if (isEdit) return orgFields;

  return [
    ...orgFields,
    { name: "managerFirstName", label: "Manager First Name", type: "text" },
    { name: "managerLastName", label: "Manager Last Name", type: "text" },
    { name: "managerEmail", label: "Manager Email", type: "email" },
    { name: "managerMobile", label: "Manager Mobile", type: "tel" },
    { name: "managerPassword", label: "Manager Password", type: "password" },
  ];
}
