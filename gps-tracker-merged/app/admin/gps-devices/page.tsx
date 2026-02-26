"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";

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
  vehicleId?: string | { _id: string; vehicleNumber?: string };
  vehicleNumber?: string;
  imei: string;
  deviceModel?: string;
  manufacturer?: string;
  simNumber?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
  connectionStatus?: "online" | "offline";
  isOnline?: boolean;
  warrantyExpiry?: string;
  status: "active" | "inactive";
}

/* ================= PAGE ================= */

export default function GpsDevicesPage() {
  const { openPopup, closePopup, isPopupOpen } = usePopups();
  const searchParams = useSearchParams();
  const searchQueryParam = searchParams.get("search");

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
    () => (orgData?.data as { _id: string; name: string; parentOrganizationId?: string | null }[]) || [],
    [orgData],
  );

  /* ================= STATE ================= */

  const [showFilters, setShowFilters] = useState(!!searchQueryParam);
  const [filters, setFilters] = useState({
    imei: searchQueryParam || "",
    model: "",
    firmware: "",
    simNumber: "",
    connectionStatus: "",
    status: "",
    assigned: "",
    vehicleNumber: "",
    warrantyExpiry: "",
    organizationId: "",
  });
  const userRole = getSecureItem("userRole");
  const canCreateDevice = userRole === "admin";
  const canEditDevice = userRole === "admin";
  const canDeleteDevice = userRole === "admin";

  const [editingDevice, setEditingDevice] = useState<GPSDevice | null>(null);
  const [selectedDeviceForAssignment, setSelectedDeviceForAssignment] =
    useState<GPSDevice | null>(null);

  /* ================= FILTER ================= */

  const filteredDevices = useMemo(() => {
    let filtered = devices;

    if (filters.imei) {
      filtered = filtered.filter((d) =>
        d.imei.toLowerCase().includes(filters.imei.toLowerCase()),
      );
    }

    if (filters.model) {
      filtered = filtered.filter((d) =>
        (d.deviceModel || "").toLowerCase().includes(filters.model.toLowerCase()),
      );
    }

    if (filters.firmware) {
      filtered = filtered.filter((d) =>
        (d.firmwareVersion || d.softwareVersion || "")
          .toLowerCase()
          .includes(filters.firmware.toLowerCase()),
      );
    }

    if (filters.simNumber) {
      filtered = filtered.filter((d) =>
        (d.simNumber || "").toLowerCase().includes(filters.simNumber.toLowerCase()),
      );
    }

    if (filters.connectionStatus) {
      filtered = filtered.filter(
        (d) =>
          (d.connectionStatus || (d.isOnline ? "online" : "offline")) ===
          filters.connectionStatus,
      );
    }

    if (filters.vehicleNumber) {
      filtered = filtered.filter((d) => {
        const fromDevice =
          (typeof d.vehicleId === "object" ? d.vehicleId?.vehicleNumber : null) ||
          d.vehicleNumber;

        if (fromDevice) {
          return fromDevice
            .toLowerCase()
            .includes(filters.vehicleNumber.toLowerCase());
        }

        const vehicleId =
          typeof d.vehicleId === "object" ? d.vehicleId?._id : d.vehicleId;
        const vehicle = vehiclesData.find((v) => v._id === vehicleId);
        return !!vehicle?.vehicleNumber
          && vehicle.vehicleNumber.toLowerCase().includes(filters.vehicleNumber.toLowerCase());
      });
    }

    if (filters.warrantyExpiry) {
      filtered = filtered.filter(
        (d) => (d.warrantyExpiry || "").split("T")[0] === filters.warrantyExpiry,
      );
    }

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

    if (filters.organizationId) {
      filtered = filtered.filter((d) => {
        const orgId = typeof d.organizationId === "object"
          ? d.organizationId._id
          : d.organizationId;
        return orgId === filters.organizationId;
      });
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
    } catch (err: any) {
      toast.error(err?.data?.message || "Operation failed");
      throw err; // re-throw so DynamicModal keeps the form open and shows inline error
    }
  };

  /* ================= FORM FIELDS (FIXED) ================= */

  const deviceFormFields: FormField[] = useMemo(() => [
    {
      name: "organizationId",
      label: "Organization",
      type: "select",
      required: true,
      groups: [
        {
          label: "Organizations",
          options: organizations
            .filter((org) => !org.parentOrganizationId)
            .map((org) => ({
              label: org.name,
              value: org._id,
            })),
        },
        {
          label: "Sub-Organizations",
          options: organizations
            .filter((org) => org.parentOrganizationId)
            .map((org) => ({
              label: org.name,
              value: org._id,
            })),
        },
      ],
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
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      options: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
    },
  ], [organizations]);


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
    setFilters({
      imei: "",
      model: "",
      firmware: "",
      simNumber: "",
      connectionStatus: "",
      status: "",
      assigned: "",
      vehicleNumber: "",
      warrantyExpiry: "",
      organizationId: "",
    });
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
    {
      header: "IMEI",
      accessor: "imei",
    },
    {
      header: "Model",
      accessor: (row: GPSDevice) => row.deviceModel || row.manufacturer || "-",
    },
    {
      header: "Firmware",
      accessor: (row: GPSDevice) => row.firmwareVersion || row.softwareVersion || "-",
    },
    { header: "SIM", accessor: "simNumber" },
    {
      header: "Organization",
      accessor: (row: GPSDevice) => {
        const org =
          typeof row.organizationId === "object" ? row.organizationId : null;
        return org?.name || "-";
      },
    },
    {
      header: "Vehicle",
      accessor: (row: GPSDevice) => {
        const fromDevice =
          (typeof row.vehicleId === "object" ? row.vehicleId?.vehicleNumber : null) ||
          row.vehicleNumber;
        if (fromDevice) return fromDevice;

        const vehicleId =
          typeof row.vehicleId === "object" ? row.vehicleId?._id : row.vehicleId;
        const vehicle = vehiclesData.find((v) => v._id === vehicleId);
        return vehicle?.vehicleNumber || "-";
      },
    },
    {
      header: "Connection",
      accessor: (row: GPSDevice) => (
        <span
          className={`capitalize text-xs font-semibold ${(row.connectionStatus || (row.isOnline ? "online" : "offline")) === "online"
            ? "text-green-600"
            : "text-red-600"
            }`}
        >
          {row.connectionStatus || (row.isOnline ? "online" : "offline")}
        </span>
      ),
    },
    {
      header: "Warranty",
      accessor: (row: GPSDevice) =>
        row.warrantyExpiry ? row.warrantyExpiry.split("T")[0] : "-",
    },
    {
      header: "Status",
      accessor: (row: GPSDevice) => (
        <span
          className={`capitalize text-xs font-semibold ${row.status === "active" ? "text-green-600" : "text-red-600"
            }`}
        >
          {capitalizeFirstLetter(row.status)}
        </span>
      ),
    },
    {
      header: "Actions",
      accessor: (row: GPSDevice) => (
        <div className="flex gap-2">
          {canEditDevice && <Edit onClick={() => openEditModal(row)} size={16} />}
          {canDeleteDevice && <Trash2 onClick={() => handleDelete(row._id)} size={16} />}
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
              className="bg-slate-100 text-slate-900 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Filter size={16} /> Filters
            </button>
            {canCreateDevice && (
              <button
                onClick={openCreateModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-700 transition-colors"
              >
                <Plus size={16} /> Add Device
              </button>
            )}
          </div>
        </div>

        {/* Filter Section */}
        {showFilters && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  IMEI
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.imei}
                  onChange={(e) =>
                    setFilters({ ...filters, imei: e.target.value })
                  }
                  placeholder="Search IMEI"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Model
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.model}
                  onChange={(e) =>
                    setFilters({ ...filters, model: e.target.value })
                  }
                  placeholder="Search model"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Firmware
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.firmware}
                  onChange={(e) =>
                    setFilters({ ...filters, firmware: e.target.value })
                  }
                  placeholder="Search firmware"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  SIM Number
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.simNumber}
                  onChange={(e) =>
                    setFilters({ ...filters, simNumber: e.target.value })
                  }
                  placeholder="Search SIM"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Assignment
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
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
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
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
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Connection
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.connectionStatus}
                  onChange={(e) =>
                    setFilters({ ...filters, connectionStatus: e.target.value })
                  }
                >
                  <option value="">All</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Vehicle Number
                </label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.vehicleNumber}
                  onChange={(e) =>
                    setFilters({ ...filters, vehicleNumber: e.target.value })
                  }
                  placeholder="Search vehicle"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Warranty
                </label>
                <input
                  type="date"
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.warrantyExpiry}
                  onChange={(e) =>
                    setFilters({ ...filters, warrantyExpiry: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                  Organization
                </label>
                <select
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                  value={filters.organizationId}
                  onChange={(e) =>
                    setFilters({ ...filters, organizationId: e.target.value })
                  }
                >
                  <option value="">All Organizations</option>
                  <optgroup label="Organizations">
                    {organizations
                      .filter((org) => !org.parentOrganizationId)
                      .map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name}
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Sub-Organizations">
                    {organizations
                      .filter((org) => org.parentOrganizationId)
                      .map((org) => (
                        <option key={org._id} value={org._id}>
                          {org.name}
                        </option>
                      ))}
                  </optgroup>
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

      {canCreateDevice && (
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
                deviceModel: editingDevice.deviceModel || "",
                manufacturer: editingDevice.manufacturer || "",
                serialNumber: editingDevice.serialNumber || "",
                firmwareVersion:
                  editingDevice.firmwareVersion || editingDevice.softwareVersion || "",
                hardwareVersion: editingDevice.hardwareVersion || "",
                warrantyExpiry: editingDevice.warrantyExpiry
                  ? editingDevice.warrantyExpiry.split("T")[0]
                  : "",
                status: editingDevice.status,
              }
              : undefined
          }
          onSubmit={handleSubmit}
        />
      )}
    </ApiErrorBoundary>
  );
}
