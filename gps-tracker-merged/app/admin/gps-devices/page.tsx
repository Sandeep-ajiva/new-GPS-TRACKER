"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Table from "@/components/ui/Table";
import Pagination from "@/components/ui/Pagination";
import ApiErrorBoundary from "@/components/admin/ErrorBoundary/ApiErrorBoundary";
import { Plus, Edit, Trash2, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import {
  useGetGpsDevicesQuery,
  useCreateGpsDeviceMutation,
  useUpdateGpsDeviceMutation,
  useDeleteGpsDeviceMutation,
} from "@/redux/api/gpsDeviceApi";

import {
  useGetVehiclesQuery,
} from "@/redux/api/vehicleApi";

import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

import { usePopups } from "../Helpers/PopupContext";
import { capitalizeFirstLetter } from "../Helpers/CapitalizeFirstLetter";
import { DynamicModal } from "@/components/common";
import { FormField } from "@/lib/formTypes";
// 🔐 ORG CONTEXT UPDATE
import { useOrgContext } from "@/hooks/useOrgContext";
import ImportExportButton from "@/components/admin/import-export/ImportExportButton";
import { InventoryLayer } from "@/components/gps-devices/InventoryLayer";
import { InventoryStatusBadge } from "@/components/gps-devices/InventoryStatusBadge";
import type { GpsDeviceRecord } from "@/components/gps-devices/inventoryTypes";
import { INVENTORY_STATUS_OPTIONS } from "@/components/gps-devices/inventoryTypes";

import { Building2 } from "lucide-react";

type DeviceFormValues = {
  organizationId?: string | { _id: string };
  imei: string;
  simNumber?: string;
  deviceModel: string;
  manufacturer?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  hardwareVersion?: string;
  warrantyExpiry?: string;
  status: "active" | "inactive";
  purchaseDate?: string;
  purchasePrice?: string | number;
  supplierName?: string;
  invoiceNumber?: string;
  stockLocation?: string;
  rackNumber?: string;
  inventoryStatus?: string;
};

type PaginatedDeviceResponse = {
  pagination?: {
    totalrecords?: number;
    totalPages?: number;
  };
  total?: number;
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error &&
    typeof (error as { data?: { message?: string } }).data?.message === "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

/* ================= PAGE ================= */

export default function GpsDevicesPage() {
  const { openPopup, closePopup, isPopupOpen } = usePopups();

  // 🔐 ORG CONTEXT UPDATE
  const { orgId, isSuperAdmin, isRootOrgAdmin, isSubOrgAdmin } = useOrgContext();
  const searchParams = useSearchParams();
  const searchQueryParam = searchParams.get("search");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<"overview" | "inventory" | "configuration" | "mapping">("overview");
  const LIMIT = 10;

  /* ================= API ================= */

  const { data: devData, isLoading: isDevLoading, refetch: refetchDevices } =
    useGetGpsDevicesQuery({ page: page - 1, limit: LIMIT }, { refetchOnMountOrArgChange: true });

  const { data: vehData, isLoading: isVehLoading } =
    useGetVehiclesQuery({ page: 0, limit: 1000 }, { refetchOnMountOrArgChange: true });

  const { data: orgData, isLoading: isOrgLoading } =
    useGetOrganizationsQuery({ page: 0, limit: 1000 }, {
      skip: !(isSuperAdmin || isRootOrgAdmin), // 🔐 Only superadmin or root-org-admin needs full org list
      refetchOnMountOrArgChange: true,
    });

  const [createGpsDevice] = useCreateGpsDeviceMutation();

  const [updateGpsDevice] = useUpdateGpsDeviceMutation();

  const [deleteGpsDevice] = useDeleteGpsDeviceMutation();

  /* ================= DATA ================= */

  const devices = useMemo(
    () => (devData?.data as GpsDeviceRecord[]) || [],
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

  // 🔐 ORG CONTEXT UPDATE
  const canCreateDevice = isSuperAdmin || isRootOrgAdmin || isSubOrgAdmin;
  const canEditDevice = isSuperAdmin || isRootOrgAdmin || isSubOrgAdmin;
  const canDeleteDevice = isSuperAdmin || isRootOrgAdmin;

  const [editingDevice, setEditingDevice] = useState<GpsDeviceRecord | null>(null);
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
        if (!d.organizationId) return false;
        const orgId = typeof d.organizationId === "object"
          ? d.organizationId._id
          : d.organizationId;
        return orgId === filters.organizationId;
      });
    }

    return filtered;
  }, [devices, vehiclesData, filters]);

  /* ================= SUBMIT ================= */

  const handleSubmit = async (data: DeviceFormValues) => {
    try {
      if (editingDevice) {
        const { organizationId: submittedOrgId, ...payloadData } = data;
        const payload = {
          ...payloadData,
          organizationId:
            typeof submittedOrgId === "object"
              ? submittedOrgId._id
              : submittedOrgId,
        };

        await updateGpsDevice({
          id: editingDevice._id, // ✅ always string
          ...payload,
        }).unwrap();

        toast.success("Device updated successfully");
      } else {
        const {
          purchaseDate,
          purchasePrice,
          supplierName,
          invoiceNumber,
          stockLocation,
          rackNumber,
          inventoryStatus,
          ...technicalData
        } = data;
        // 🔐 ORG CONTEXT UPDATE
        // If user is NOT superadmin or root-org-admin, lock organization from context
        const finalData: Record<string, unknown> = {
          ...technicalData,
          inventory: {
            status: inventoryStatus || "in_stock",
            purchaseDate: purchaseDate || null,
            purchasePrice: purchasePrice === "" || purchasePrice === undefined ? null : Number(purchasePrice),
            supplierName: supplierName || "",
            invoiceNumber: invoiceNumber || "",
            stockLocation: stockLocation || "",
            rackNumber: rackNumber || "",
          },
        };
        if (!(isSuperAdmin || isRootOrgAdmin)) {
          finalData.organizationId = orgId || "";
        }
        await createGpsDevice(finalData).unwrap();
        toast.success("Device created successfully");
      }
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Operation failed"));
      throw err;
    }
  };

  /* ================= FORM FIELDS (FIXED) ================= */

  const deviceFormFields: FormField[] = useMemo(() => [
    ...(isSuperAdmin || isRootOrgAdmin ? [
      {
        name: "organizationId",
        label: "Organization",
        type: "select" as const,
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
      }
    ] : []),
    { name: "imei", label: "IMEI", type: "text", required: true, helperText: "Exactly 15 digits" },
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
    ...(!editingDevice ? [
      {
        name: "purchaseDate",
        label: "Purchase Date",
        type: "date" as const,
        section: "Inventory Information",
      },
      {
        name: "purchasePrice",
        label: "Purchase Price",
        type: "number" as const,
      },
      {
        name: "supplierName",
        label: "Supplier Name",
        type: "text" as const,
      },
      {
        name: "invoiceNumber",
        label: "Invoice Number",
        type: "text" as const,
      },
      {
        name: "stockLocation",
        label: "Stock Location",
        type: "text" as const,
      },
      {
        name: "rackNumber",
        label: "Rack Number",
        type: "text" as const,
      },
      {
        name: "inventoryStatus",
        label: "Inventory Status",
        type: "select" as const,
        options: INVENTORY_STATUS_OPTIONS.map((value) => ({
          label: value.replace("_", " ").replace(/\b\w/g, (char) => char.toUpperCase()),
          value,
        })),
      },
    ] : []),
  ], [editingDevice, isRootOrgAdmin, isSuperAdmin, organizations]);

  const deviceSchema = useMemo(() => {
    const base = z.object({
      organizationId: z.string().optional(),
      imei: z.string().regex(/^\d{15}$/, "IMEI must be exactly 15 digits"),
      simNumber: z.string().optional(),
      deviceModel: z.string().min(1, "Device model is required"),
      manufacturer: z.string().optional(),
      serialNumber: z.string().optional(),
      firmwareVersion: z.string().optional(),
      hardwareVersion: z.string().optional(),
      warrantyExpiry: z.string().optional(),
      status: z.enum(["active", "inactive"]),
      purchaseDate: z.string().optional(),
      purchasePrice: z.union([z.string(), z.number()]).optional(),
      supplierName: z.string().optional(),
      invoiceNumber: z.string().optional(),
      stockLocation: z.string().optional(),
      rackNumber: z.string().optional(),
      inventoryStatus: z.string().optional(),
    });

    return base.superRefine((val, ctx) => {
      if ((isSuperAdmin || isRootOrgAdmin) && !val.organizationId) {
        ctx.addIssue({ code: "custom", path: ["organizationId"], message: "Organization is required" });
      }
    });
  }, [isSuperAdmin, isRootOrgAdmin]);


  /* ================= MODALS ================= */

  const openCreateModal = () => {
    setEditingDevice(null);
    openPopup("deviceModal");
  };

  const openEditModal = (device: GpsDeviceRecord) => {
    const orgId = device.organizationId && typeof device.organizationId === "object"
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
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Delete failed"));
    }
  };

  /* ================= TABLE ================= */

  const columns: any[] = [
    {
      header: "IMEI",
      headerClassName: "min-w-[190px]",
      cellClassName: "min-w-[190px]",
      accessor: (row: GpsDeviceRecord) => (
        <span className="block max-w-[190px] break-all font-mono text-xs text-slate-700">
          {row.imei}
        </span>
      ),
    },
    {
      header: "Model",
      headerClassName: "min-w-[120px]",
      cellClassName: "min-w-[120px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => (
        <span className="block whitespace-nowrap text-sm font-semibold text-slate-800">
          {row.deviceModel || row.manufacturer || "-"}
        </span>
      ),
    },
    {
      header: "Firmware",
      headerClassName: "min-w-[120px]",
      cellClassName: "min-w-[120px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => row.firmwareVersion || row.softwareVersion || "-",
    },
    {
      header: "SIM",
      headerClassName: "min-w-[120px]",
      cellClassName: "min-w-[120px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => row.simNumber || "-",
    },
    {
      header: "Inventory",
      headerClassName: "min-w-[120px]",
      cellClassName: "min-w-[120px]",
      accessor: (row: GpsDeviceRecord) => (
        <InventoryStatusBadge device={row} compact />
      ),
    },
    {
      header: "Organization",
      headerClassName: "min-w-[140px]",
      cellClassName: "min-w-[140px]",
      accessor: (row: GpsDeviceRecord) => {
        const org =
          typeof row.organizationId === "object" ? row.organizationId : null;
        return (
          <span className="block max-w-[140px] break-words leading-5 text-slate-700">
            {org?.name || "-"}
          </span>
        );
      },
    },
    {
      header: "Vehicle",
      headerClassName: "min-w-[120px]",
      cellClassName: "min-w-[120px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => {
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
      headerClassName: "min-w-[100px]",
      cellClassName: "min-w-[100px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => (
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
      headerClassName: "min-w-[110px]",
      cellClassName: "min-w-[110px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) =>
        row.warrantyExpiry ? row.warrantyExpiry.split("T")[0] : "-",
    },
    {
      header: "Status",
      headerClassName: "min-w-[90px]",
      cellClassName: "min-w-[90px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => (
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
      headerClassName: "min-w-[80px]",
      cellClassName: "min-w-[80px] whitespace-nowrap",
      accessor: (row: GpsDeviceRecord) => (
        <div className="flex gap-2">
          {canEditDevice && <Edit onClick={() => openEditModal(row)} size={16} />}
          {canDeleteDevice && <Trash2 onClick={() => handleDelete(row._id)} size={16} />}
        </div>
      ),
    },
  ];

  const isLoading = isDevLoading || isVehLoading || isOrgLoading;
  const paginatedData = devData as PaginatedDeviceResponse | undefined;
  const totalRecords =
    paginatedData?.pagination?.totalrecords ??
    paginatedData?.total ??
    devices.length;
  const totalPages =
    paginatedData?.pagination?.totalPages ??
    Math.max(1, Math.ceil(totalRecords / LIMIT));

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
            <ImportExportButton
              moduleName="devices"
              importUrl="/importexport/import/devices"
              exportUrl="/importexport/export/devices"
              allowedFields={[
                "organizationId",
                "imei",
                "softwareVersion",
                "vendorId",
                "deviceModel",
                "manufacturer",
                "simNumber",
                "serialNumber",
                "firmwareVersion",
                "hardwareVersion",
                "warrantyExpiry",
                "status",
                "vehicleRegistrationNumber",
              ]}
              requiredFields={["organizationId", "imei", "softwareVersion"]}
              filters={{
                imei: filters.imei,
                status: filters.status,
                connectionStatus: filters.connectionStatus,
                organizationId: filters.organizationId,
              }}
              onCompleted={() => {
                void refetchDevices();
              }}
            />
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

        <div className="flex flex-wrap items-center gap-2">
          {([
            { key: "overview", label: "Overview" },
            { key: "inventory", label: "Inventory" },
            { key: "configuration", label: "Configuration" },
            { key: "mapping", label: "Mapping" },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] transition-colors ${activeTab === tab.key
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "inventory" ? (
          <InventoryLayer variant="light" canEdit={canEditDevice} />
        ) : activeTab === "configuration" ? (
          <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Configuration</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Current device configuration flow stays unchanged</h2>
              <p className="mt-3 text-sm text-slate-600">
                Device configuration continues to live in the existing Add/Edit Device modal. Firmware, hardware version,
                warranty, SIM, and core technical properties remain managed there so current CRUD behavior is not disturbed.
              </p>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Managed in Overview</p>
                  <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                    <li>IMEI and SIM details</li>
                    <li>Device model and manufacturer</li>
                    <li>Firmware and hardware versions</li>
                    <li>Warranty expiry and active status</li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Inventory handled separately</p>
                  <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                    <li>Inventory status lifecycle</li>
                    <li>Purchase and supplier metadata</li>
                    <li>Fault and repair notes</li>
                    <li>Audit timestamps and updater</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Quick Actions</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Jump back to device CRUD</h3>
              <p className="mt-3 text-sm text-slate-600">
                Open the Overview tab to continue using the current device forms without any inventory payload mixed in.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="mt-5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-blue-700"
              >
                Open Overview
              </button>
            </div>
          </div>
        ) : activeTab === "mapping" ? (
          <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Mapping</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Device mapping stays in the existing mapping module</h2>
              <p className="mt-3 text-sm text-slate-600">
                Inventory status is display-only here. Assignment and installation state continue to come from the backend
                mapping and TCP flows. No frontend inventory sync is performed.
              </p>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">What stays untouched</p>
                <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
                  <li>Vehicle-to-device assignment</li>
                  <li>Driver mapping screens</li>
                  <li>Live tracking and packet flow</li>
                  <li>Current mapping backend contracts</li>
                </ul>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-slate-500">Open Mapping</p>
              <h3 className="mt-2 text-xl font-black text-slate-900">Go to Device Mapping</h3>
              <p className="mt-3 text-sm text-slate-600">
                Use the existing mapping page for assignment and unassignment. Inventory badges here will reflect backend state automatically.
              </p>
              <Link
                href="/admin/device-mapping"
                className="mt-5 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-slate-800"
              >
                Open Device Mapping
              </Link>
            </div>
          </div>
        ) : (
          <>

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
                  {/* 🔐 ORG CONTEXT UPDATE */}
                  {(isSuperAdmin || isRootOrgAdmin) && (
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
                  )}
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
              <Table columns={columns} data={filteredDevices as any} />
              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={totalRecords}
                onPageChange={setPage}
                disabled={isDevLoading}
              />
            </div>
          </>
        )}
      </div>

      {canCreateDevice && (
        <DynamicModal
          isOpen={isPopupOpen("deviceModal")}
          onClose={closeModal}
          title={editingDevice ? "Edit Device" : "New Device"}
          fields={deviceFormFields}
          schema={deviceSchema}
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
              : {
                organizationId: "",
                imei: "",
                simNumber: "",
                deviceModel: "",
                manufacturer: "",
                serialNumber: "",
                firmwareVersion: "",
                hardwareVersion: "",
                warrantyExpiry: "",
                status: "active",
                purchaseDate: "",
                purchasePrice: "",
                supplierName: "",
                invoiceNumber: "",
                stockLocation: "",
                rackNumber: "",
                inventoryStatus: "in_stock",
              }
          }
          onSubmit={handleSubmit}
        />
      )}
    </ApiErrorBoundary>
  );
}
