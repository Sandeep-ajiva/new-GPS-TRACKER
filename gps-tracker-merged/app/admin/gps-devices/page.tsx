"use client";

import { useState, useMemo } from "react";
import Table from "@/components/ui/Table";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  useGetGpsDevicesQuery,
  useCreateGpsDeviceMutation,
  useUpdateGpsDeviceMutation,
  useDeleteGpsDeviceMutation,
} from "@/redux/api/gpsDeviceApi";

import {
  useGetVehiclesQuery,
  useUpdateVehicleMutation,
} from "@/redux/api/vehicleApi";

import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";

import {
  Cpu,
  Smartphone,
  Layout,
  Activity,
  ToggleLeft,
  Building2,
} from "lucide-react";

/* ================= TYPES ================= */

export interface GPSDevice {
  _id: string;
  organizationId: string | { _id: string; name: string };
  imei: string;
  deviceModel: string;
  manufacturer?: string;
  simNumber?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  connectionStatus: "online" | "offline";
  warrantyExpiry?: string;
  status: "active" | "inactive";
}

/* ================= PAGE ================= */

export default function GpsDevicesPage() {
  const { openPopup, closePopup, isPopupOpen } = usePopups();

  /* ================= API ================= */

  const { data: devData, isLoading: isDevLoading } =
    useGetGpsDevicesQuery(undefined, { refetchOnMountOrArgChange: true });

  const { data: vehData, isLoading: isVehLoading } =
    useGetVehiclesQuery(undefined, { refetchOnMountOrArgChange: true });

  const { data: orgData, isLoading: isOrgLoading } =
    useGetOrganizationsQuery(undefined, { refetchOnMountOrArgChange: true });

  const [createGpsDevice, { isLoading: isCreating }] =
    useCreateGpsDeviceMutation();

  const [updateGpsDevice, { isLoading: isUpdating }] =
    useUpdateGpsDeviceMutation();

  const [deleteGpsDevice, { isLoading: isDeleting }] =
    useDeleteGpsDeviceMutation();

  const [updateVehicle] = useUpdateVehicleMutation();

  /* ================= DATA ================= */

  const devices = useMemo(
    () => (devData?.data as GPSDevice[]) || [],
    [devData],
  );

  const vehiclesData = useMemo(
    () =>
      (vehData?.data as {
        _id: string;
        vehicleNumber: string;
        deviceId?: string;
        model?: string;
        vehicleType?: string;
      }[]) || [],
    [vehData],
  );

  const organizations = useMemo(
    () => (orgData?.data as { _id: string; name: string }[]) || [],
    [orgData],
  );

  /* ================= STATE ================= */

  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ assigned: "", status: "" });

  const [editingDevice, setEditingDevice] = useState<GPSDevice | null>(null);
  const [selectedDeviceForAssignment, setSelectedDeviceForAssignment] =
    useState<GPSDevice | null>(null);

  /* ================= FILTER ================= */

  const filteredDevices = useMemo(() => {
    let filtered = devices;

    if (filters.assigned === "assigned") {
      filtered = filtered.filter((d) =>
        vehiclesData.find((v) => v.deviceId === d._id),
      );
    }

    if (filters.assigned === "unassigned") {
      filtered = filtered.filter(
        (d) => !vehiclesData.find((v) => v.deviceId === d._id),
      );
    }

    if (filters.status) {
      filtered = filtered.filter((d) => d.status === filters.status);
    }

    return filtered;
  }, [devices, vehiclesData, filters]);

  /* ================= SUBMIT ================= */

  const handleSubmit = async (data: Record<string, any>) => {
    try {
      if (editingDevice) {
        const { _id, ...payloadData } = data;
        const payload = {
          ...payloadData,
          organizationId:
            typeof data.organizationId === "object"
              ? data.organizationId._id
              : data.organizationId,
        };

        await updateGpsDevice({
          id: editingDevice._id, // ✅ always string
          ...payload,
        }).unwrap();

        toast.success("Device updated successfully");
      } else {
        await createGpsDevice(data).unwrap();
        toast.success("Device created successfully");
      }

      closeModal();
    } catch (err: any) {
      toast.error(err?.data?.message || "Operation failed");
    }
  };

  /* ================= FORM FIELDS (FIXED) ================= */

  const deviceFormFields: FormField[] = [
    {
      name: "organizationId",
      label: "Organization",
      type: "select",
      required: true,
      options: organizations.map((org) => ({
        label: org.name,
        value: org._id,
      })),
      icon: <Building2 size={14} />,
    },
    { name: "imei", label: "IMEI", type: "text", required: true },
    { name: "simNumber", label: "SIM Number", type: "text" },
    {
      name: "deviceModel",
      label: "Device Model",
      type: "text",
      required: true,
    },
    { name: "manufacturer", label: "Manufacturer", type: "text" },
    { name: "serialNumber", label: "Serial Number", type: "text" },
    { name: "firmwareVersion", label: "Firmware Version", type: "text" },
    { name: "hardwareVersion", label: "Hardware Version", type: "text" },
    {
      name: "warrantyExpiry",
      label: "Warranty Expiry",
      type: "date",
    },
    {
      name: "connectionStatus",
      label: "Connection Status",
      type: "select",
      required: true,
      options: [
        { label: "Online", value: "online" },
        { label: "Offline", value: "offline" },
      ],
    },
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

  /* ================= MODALS ================= */

  const openCreateModal = () => {
    setEditingDevice(null);
    openPopup("deviceModal");
  };

  const openEditModal = (device: GPSDevice) => {
    const orgId = typeof device.organizationId === "object"
      ? device.organizationId._id
      : device.organizationId;

    setEditingDevice({
      ...device,
      organizationId: orgId as string,
    });

    openPopup("deviceModal");
  };

  const closeModal = () => {
    closePopup("deviceModal");
    setEditingDevice(null);
  };

  const clearFilters = () => {
    setFilters({ assigned: "", status: "" });
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id: string) => {
    if (!id || typeof id !== "string") {
      toast.error("Invalid device id");
      return;
    }

    if (!confirm("Delete this device?")) return;

    try {
      await deleteGpsDevice(id).unwrap();
      toast.success("Device deleted");
    } catch (err: any) {
      toast.error(err?.data?.message || "Delete failed");
    }
  };

  /* ================= TABLE ================= */

  const columns = [
    { header: "IMEI", accessor: "imei" },
    { header: "Model", accessor: "deviceModel" },
    { header: "Firmware", accessor: "firmwareVersion" },
    {
      header: "Status",
      accessor: (row: GPSDevice) => capitalizeFirstLetter(row.status),
    },
    {
      header: "Actions",
      accessor: (row: GPSDevice) => (
        <div className="flex gap-2">
          <Edit onClick={() => openEditModal(row)} size={16} />
          <Trash2 onClick={() => handleDelete(row._id)} size={16} />
        </div>
      ),
    },
  ];

  const isLoading = isDevLoading || isVehLoading || isOrgLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <ApiErrorBoundary hasError={false}>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">GPS Devices</h1>
            <p className="text-sm text-slate-500">
              Manage GPS tracking devices and their assignments.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Filter size={16} /> Filters
            </button>
            <button
              onClick={openCreateModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Plus size={16} /> Add Device
            </button>
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Assignment
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
                  value={filters.assigned}
                  onChange={(e) =>
                    setFilters({ ...filters, assigned: e.target.value })
                  }
                >
                  <option value="">All Devices</option>
                  <option value="assigned">Assigned to Vehicle</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Status
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold focus:ring-2 focus:ring-slate-900/10 outline-none"
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

        {/* Table Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <Table columns={columns} data={filteredDevices} />
        </div>
      </div>

      <DynamicModal
        isOpen={isPopupOpen("deviceModal")}
        onClose={closeModal}
        title={editingDevice ? "Edit Device" : "New Device"}
        fields={deviceFormFields}
        initialData={
          editingDevice
            ? {
              organizationId: typeof editingDevice.organizationId === "object"
                ? editingDevice.organizationId._id
                : editingDevice.organizationId,
              imei: editingDevice.imei,
              simNumber: editingDevice.simNumber || "",
              deviceModel: editingDevice.deviceModel,
              manufacturer: editingDevice.manufacturer || "",
              serialNumber: editingDevice.serialNumber || "",
              firmwareVersion: editingDevice.firmwareVersion || "",
              hardwareVersion: editingDevice.hardwareVersion || "",
              warrantyExpiry: editingDevice.warrantyExpiry
                ? editingDevice.warrantyExpiry.split("T")[0]
                : "",
              connectionStatus: editingDevice.connectionStatus,
              status: editingDevice.status,
            }
            : undefined
        }
        onSubmit={handleSubmit}
      />
    </ApiErrorBoundary>
  );
}
