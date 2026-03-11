"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Table from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from "@/redux/api/usersApi";

import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";

import {
  User as UserIcon,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  ToggleRight,
  Building2,
} from "lucide-react";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: "admin" | "manager" | "superadmin" | "driver" | "viewer";
  organizationId?: string | { _id: string; name: string };
  status: "active" | "inactive";
}

export default function UsersPage() {
  const { openPopup, closePopup, isPopupOpen, getPopupData } = usePopups();

  const searchParams = useSearchParams();
  const searchQueryParam = searchParams.get("search");

  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 10;

  const [filters, setFilters] = useState({
    name: searchQueryParam || "",
    email: "",
    mobile: "",
    role: "",
    status: "",
    organizationId: "",
    organizationName: "",
    startDate: "",
    endDate: "",
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  // API Hooks
  const { data: usersData, isLoading: isUsersLoading, refetch: refetchUsers } = useGetUsersQuery(
    { page: page - 1, limit: LIMIT },
    {
      refetchOnMountOrArgChange: true,
    },
  );

  const { data: orgData, isLoading: isOrgLoading } =
    useGetOrganizationsQuery({ page: 0, limit: 1000 }, {
      refetchOnMountOrArgChange: true,
    });

  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deleteUser] = useDeleteUserMutation();

  // Safe Response Mapping
  const displayUsers = usersData?.users || usersData?.data || usersData?.docs || [];
  const displayOrgs = orgData?.organizations || orgData?.data || orgData?.docs || [];
  const userTotal = (usersData as any)?.pagination?.totalrecords || (usersData as any)?.total || displayUsers.length;
  
  const isLoading = isUsersLoading || isOrgLoading;
  // Filter users based on search and filters
  const filteredUsers = useMemo(() => {
    let filtered = displayUsers;

    // Search filter
    if (filters.name) {
      const searchLower = filters.name.toLowerCase();
      filtered = filtered.filter((user: any) => 
        user.firstName?.toLowerCase().includes(searchLower) ||
        user.lastName?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower)
      );
    }

    // Role filter
    if (filters.role) {
      filtered = filtered.filter((user: any) => user.role === filters.role);
    }

    // Organization filter
    if (filters.organizationId) {
      filtered = filtered.filter((user: any) => {
        const userOrgId = typeof user.organizationId === 'object' ? user.organizationId?._id : user.organizationId;
        return userOrgId === filters.organizationId;
      });
    }

    return filtered;
  }, [displayUsers, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / LIMIT);
  const paginatedUsers = filteredUsers.slice((page - 1) * LIMIT, page * LIMIT);

  // Form schema definition
  const userFormFields: FormField[] = [
    {
      name: "firstName",
      label: "First Name",
      type: "text",
      placeholder: "Enter first name",
      required: true,
      icon: <UserIcon size={16} />,
    },
    {
      name: "lastName",
      label: "Last Name",
      type: "text",
      placeholder: "Enter last name",
      required: true,
      icon: <UserIcon size={16} />,
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
      name: "mobile",
      label: "Mobile Number",
      type: "tel",
      placeholder: "Enter mobile number",
      icon: <Phone size={16} />,
    },
    {
      name: "password",
      label: "Password",
      type: "password",
      placeholder: editingUser ? "Leave blank to keep current" : "Enter password",
      required: !editingUser,
      icon: <Lock size={16} />,
    },
    {
      name: "role",
      label: "Role",
      type: "select",
      required: true,
      icon: <ShieldCheck size={16} />,
      options: [
        { label: "Super Admin", value: "superadmin" },
        { label: "Organization Admin", value: "admin" },
        { label: "Manager", value: "manager" },
        { label: "Driver", value: "driver" },
        { label: "Viewer", value: "viewer" },
      ],
    },
    {
      name: "organizationId",
      label: "Organization",
      type: "select",
      required: false,
      icon: <Building2 size={16} />,
      options: displayOrgs.map((org: any) => ({
        label: org.name,
        value: org._id,
      })),
    },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      icon: <ToggleRight size={16} />,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ];

  // Zod schema for validation
  const userSchema = useMemo(() => {
    return z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      email: z.string().email("Valid email is required"),
      mobile: z.string().optional(),
      password: z.string().optional(),
      role: z.enum(["superadmin", "admin", "manager", "driver", "viewer"]),
      organizationId: z.string().optional(),
      status: z.enum(["active", "inactive"]),
    }).superRefine((val, ctx) => {
      if (!editingUser && !val.password) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password is required for new users" });
      }
      if (val.password && val.password.length < 6) {
        ctx.addIssue({ code: "custom", path: ["password"], message: "Password must be at least 6 characters" });
      }
      if ((val.role === "admin" || val.role === "manager" || val.role === "driver" || val.role === "viewer") && !val.organizationId) {
        ctx.addIssue({ code: "custom", path: ["organizationId"], message: "Organization is required for this role" });
      }
    });
  }, [editingUser]);

  // Form submission handler
  const handleUserSubmit = async (data: Record<string, any>) => {
    try {
      const payload = {
        ...data,
        // Only include password if it's provided
        ...(data.password && { password: data.password }),
      };

      if (editingUser) {
        await updateUser({ id: editingUser._id, ...payload }).unwrap();
        toast.success("User updated successfully");
      } else {
        await createUser(payload).unwrap();
        toast.success("User created successfully");
      }
      
      closePopup("userModal");
      refetchUsers();
    } catch (error: any) {
      toast.error(error.data?.message || "Failed to save user");
    }
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingUser(null);
    openPopup("userModal");
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    const orgId = typeof user.organizationId === 'object' ? user.organizationId?._id : user.organizationId;
    openPopup("userModal", {
      ...user,
      organizationId: orgId || "",
    });
  };

  // Delete handler
  const handleDelete = async (user: User) => {
    if (confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      try {
        await deleteUser(user._id).unwrap();
        toast.success("User deleted successfully");
        refetchUsers();
      } catch (error: any) {
        toast.error(error.data?.message || "Failed to delete user");
      }
    }
  };

  // Table columns definition
  const columns = [
    {
      header: "Name",
      accessor: (row: any) => `${row.firstName || ""} ${row.lastName || ""}`.trim() || "Unknown",
    },
    { header: "Email", accessor: "email" },
    { header: "Mobile", accessor: "mobile" },
    {
      header: "Role",
      accessor: (row: any) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
          row.role === "superadmin" 
            ? "border-purple-500/30 bg-purple-500/20 text-purple-200"
            : row.role === "admin"
            ? "border-blue-500/30 bg-blue-500/20 text-blue-200"
            : "border-emerald-500/30 bg-emerald-500/20 text-emerald-200"
        }`}>
          {capitalizeFirstLetter(row.role)}
        </span>
      ),
    },
    {
      header: "Organization",
      accessor: (row: any) => {
        if (typeof row.organizationId === 'object') {
          return row.organizationId?.name || "Not Assigned";
        }
        const org = displayOrgs.find((o: any) => o._id === row.organizationId);
        return org?.name || (row.role === "superadmin" ? "Global" : "Not Assigned");
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
            onClick={() => openEditModal(row)}
            className="text-slate-200 hover:text-white transition-colors"
            title="Edit user"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(row)}
            className="text-rose-300 hover:text-rose-200 transition-colors"
            title="Delete user"
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
              User Management
            </p>
            <h1 className="text-3xl font-black text-slate-100 tracking-tight">
              Users
            </h1>
            <p className="text-slate-400 font-bold mt-1">
              Manage system users and their access permissions.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-xs font-black uppercase tracking-widest text-emerald-200 transition hover:bg-emerald-500/30 flex items-center gap-2"
          >
            <Plus size={16} />
            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Users
              </label>
              <input
                type="text"
                placeholder="Search by name, email..."
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Roles</option>
                <option value="superadmin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="driver">Driver</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization
              </label>
              <select
                value={filters.organizationId}
                onChange={(e) => setFilters({ ...filters, organizationId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Organizations</option>
                {displayOrgs.map((org: any) => (
                  <option key={org._id} value={org._id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <Table
            columns={columns}
            data={paginatedUsers}
            loading={isLoading}
            variant="light"
          />
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-gray-100">
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
          isOpen={isPopupOpen("userModal")}
          onClose={() => closePopup("userModal")}
          title={editingUser ? "Edit User" : "Create New User"}
          description={
            editingUser
              ? "Update user information and permissions."
              : "Add a new user to the system with appropriate role and access."
          }
          fields={userFormFields}
          initialData={isPopupOpen("userModal") ? (getPopupData("userModal") || {}) : {}}
          schema={userSchema}
          onSubmit={handleUserSubmit}
          submitLabel={editingUser ? "Update User" : "Create User"}
          variant="dark"
        />
      </div>
    </ApiErrorBoundary>
  );
}
