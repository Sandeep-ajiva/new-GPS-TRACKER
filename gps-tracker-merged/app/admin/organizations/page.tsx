"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Loader2, Eye, Filter } from "lucide-react";
import { toast } from "sonner";

import {
  useGetOrganizationsQuery,
  useGetSubOrganizationsQuery,
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
  /* ---------------------------------------
     STEP 1: Fetch all organizations
  ---------------------------------------- */
  const { data: allOrgResponse, isLoading: loadingAll } =
    useGetOrganizationsQuery(undefined, { refetchOnMountOrArgChange: true });

  const allOrganizations: Organization[] = useMemo(
    () => allOrgResponse?.data || [],
    [allOrgResponse],
  );

  /* ---------------------------------------
     STEP 2: Find parent organization
  ---------------------------------------- */
  const parentOrg = useMemo(
    () => allOrganizations.find((o) => o.parentOrganizationId === null),
    [allOrganizations],
  );

  const parentOrgId = parentOrg?._id;

  /* ---------------------------------------
     STEP 3: Fetch sub-organizations
  ---------------------------------------- */
  const {
    data: subOrgResponse,
    isLoading,
    error,
  } = useGetSubOrganizationsQuery(parentOrgId!, {
    skip: !parentOrgId,
  });

  /* ---------------------------------------
     Mutations
  ---------------------------------------- */
  const [createSubOrgWithManager] = useCreateSubOrgWithManagerMutation();
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

  const organizations: Organization[] = useMemo(
    () => subOrgResponse?.data || [],
    [subOrgResponse],
  );

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
  }, [organizations, filters.name, filters.status, filters.type]);

  const clearFilters = () => {
    setFilters({ name: "", type: "", status: "" });
  };

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
        await createSubOrgWithManager({
          parentOrganizationId: parentOrgId,
          organizationData: {
            name: form.name,
            organizationType: form.organizationType,
            email: form.email, // shared email
            phone: form.phone,
            address,
            geo: {
              lat: null,
              lng: null,
              timezone: "Asia/Kolkata",
            },
            settings: {
              speedAlert: true,
              speedLimit: 80,
              idleTimeThreshold: 5,
              lowFuelThreshold: 20,
              workingHours: "09:00-18:00",
            },
          },
          managerData: {
            firstName: form.managerFirstName,
            lastName: form.managerLastName,
            email: form.email, // SAME email as organization
            password: form.managerPassword,
          },
        }).unwrap();

        toast.success("Sub-organization & manager created successfully");
      }

      closeModal();
    } catch (err: any) {
      toast.error(err?.data?.message || "Operation failed");
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
      header: "Address",
      accessor: (row: Organization) => {
        const address = row.address || {};
        const parts = [
          address.addressLine,
          address.city,
          address.state,
          address.country,
          address.pincode,
        ].filter(Boolean);
        return (
          <span className="text-xs font-semibold text-slate-600">
            {parts.length > 0 ? parts.join(", ") : "-"}
          </span>
        );
      },
    },
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
            onClick={() => router.push(`/dashboard?organizationId=${row._id}`)}
            className="text-slate-500 hover:text-slate-900"
            title="Open manager dashboard"
          >
            <Eye size={16} />
          </button>
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black">Sub Organizations</h1>
            <p className="text-sm text-slate-500">Parent: {parentOrg?.name}</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Filter size={14} /> Filter
            </button>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={14} /> Add Sub Organization
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Name
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.name}
                  onChange={(e) =>
                    setFilters({ ...filters, name: e.target.value })
                  }
                  placeholder="Search name"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Type
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.type}
                  onChange={(e) =>
                    setFilters({ ...filters, type: e.target.value })
                  }
                >
                  <option value="">All Types</option>
                  <option value="logistics">Logistics</option>
                  <option value="transport">Transport</option>
                  <option value="school">School</option>
                  <option value="taxi">Taxi</option>
                  <option value="fleet">Fleet</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Status
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <Table columns={columns} data={filteredOrganizations} loading={isLoading} />

        <DynamicModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={
            editingOrg
              ? "Edit Organization"
              : "Create Sub Organization & Manager"
          }
          fields={getFormFields(!!editingOrg)}
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
    {
      name: "email",
      label: "Organization / Manager Email",
      type: "email",
      required: true,
    },
    { name: "phone", label: "Organization Phone", type: "tel", required: true },
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
      label: "Manager First Name",
      type: "text",
      required: true,
    },
    {
      name: "managerLastName",
      label: "Manager Last Name",
      type: "text",
      required: true,
    },
    {
      name: "managerPassword",
      label: "Manager Password",
      type: "password",
      required: true,
    },
  ];
}
