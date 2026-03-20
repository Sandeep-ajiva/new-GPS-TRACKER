"use client";

import { useMemo, type ReactNode } from "react";
import { AlertCircle, Building2, Info, Loader2, Package, Settings, Shield, Smartphone } from "lucide-react";
import {
  extractGpsDeviceDetails,
  useGetGpsDeviceQuery,
  type GpsDeviceConfiguration,
  type GpsDeviceDetails,
} from "@/redux/api/gpsDeviceApi";
import {
  formatCurrencyValue,
  formatInventoryStatus,
  formatUpdatedBy,
  type DeviceInventory,
} from "@/components/gps-devices/inventoryTypes";
import { formatDateTime, formatStatus } from "@/components/superadmin/superadmin-data";
import { getApiErrorMessage } from "@/utils/apiError";
import SimpleModal from "./SimpleModal";

interface DeviceDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
}

const EMPTY_VALUE = "—";

type DetailValue = string | number | null | undefined;

type DetailSectionProps = {
  icon: ReactNode;
  title: string;
  fields: Array<{
    label: string;
    value: ReactNode;
  }>;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const readText = (value: unknown): string => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || EMPTY_VALUE;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return EMPTY_VALUE;
};

const pickFirstText = (...values: unknown[]) => {
  for (const value of values) {
    const text = readText(value);
    if (text !== EMPTY_VALUE) {
      return text;
    }
  }

  return EMPTY_VALUE;
};

const formatDateValue = (value: unknown) => {
  if (typeof value === "string" || value instanceof Date) {
    return formatDateTime(value instanceof Date ? value.toISOString() : value) || EMPTY_VALUE;
  }

  return EMPTY_VALUE;
};

const formatCurrency = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return formatCurrencyValue(value);
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return formatCurrencyValue(numeric);
    }

    return value.trim();
  }

  return EMPTY_VALUE;
};

const booleanLabel = (
  value: unknown,
  trueLabel: string,
  falseLabel: string,
): string => {
  if (value === true) return trueLabel;
  if (value === false) return falseLabel;
  return EMPTY_VALUE;
};

const entityLabel = (value: unknown) => {
  if (typeof value === "string") {
    return value.trim() || EMPTY_VALUE;
  }

  const record = asRecord(value);
  if (!record) {
    return EMPTY_VALUE;
  }

  const fullName = [readText(record.firstName), readText(record.lastName)]
    .filter((item) => item !== EMPTY_VALUE)
    .join(" ")
    .trim();

  return pickFirstText(
    fullName,
    record.name,
    record.vehicleNumber,
    record.registrationNumber,
    record.plateNumber,
    record.email,
    record._id,
  );
};

const getOrganizationLabel = (device: GpsDeviceDetails | null) => {
  if (!device) return EMPTY_VALUE;

  const organization = device.organizationId;
  return entityLabel(organization);
};

const getVehicleLabel = (device: GpsDeviceDetails | null) => {
  if (!device) return EMPTY_VALUE;

  const vehicle = asRecord(device.vehicleId);

  return pickFirstText(
    vehicle?.vehicleNumber,
    vehicle?.registrationNumber,
    vehicle?.plateNumber,
    vehicle?.name,
    device.vehicleNumber,
    device.vehicleRegistrationNumber,
    device.registrationNumber,
    device.plateNumber,
    typeof device.vehicleId === "string" ? device.vehicleId : undefined,
  );
};

const getVehicleRegistration = (device: GpsDeviceDetails | null) => {
  if (!device) return EMPTY_VALUE;

  const vehicle = asRecord(device.vehicleId);

  return pickFirstText(
    vehicle?.registrationNumber,
    vehicle?.plateNumber,
    device.vehicleRegistrationNumber,
    device.registrationNumber,
    device.plateNumber,
  );
};

const getInventory = (device: GpsDeviceDetails | null): DeviceInventory | null => {
  const inventory = asRecord(device?.inventory);
  return inventory ? (inventory as DeviceInventory) : null;
};

const getConfiguration = (device: GpsDeviceDetails | null): GpsDeviceConfiguration | null => {
  const configuration = asRecord(device?.configuration);
  return configuration ? (configuration as GpsDeviceConfiguration) : null;
};

const getConnectionStatus = (device: GpsDeviceDetails | null) => {
  if (!device) return "Unknown";

  const lastLoginTime = readText(device.lastLoginTime);
  const lastSeen = readText(device.lastSeen);

  if (lastLoginTime === EMPTY_VALUE && lastSeen === EMPTY_VALUE) {
    return "Never Connected";
  }

  if (device.connectionStatus === "online" || device.isOnline === true) {
    return "Online";
  }

  if (device.connectionStatus === "offline" || device.isOnline === false) {
    return "Offline";
  }

  if (typeof device.connectionStatus === "string" && device.connectionStatus.trim()) {
    return formatStatus(device.connectionStatus);
  }

  return "Unknown";
};

const getConnectionBadgeTone = (value: string) => {
  if (value === "Online") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "Offline" || value === "Never Connected") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-slate-200 bg-slate-100 text-slate-700";
};

const getDeviceStatusBadgeTone = (value: string) => {
  if (value === "active") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (value === "inactive") {
    return "border-slate-200 bg-slate-100 text-slate-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
};

const renderBadge = (label: string, tone: string) => (
  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] ${tone}`}>
    {label}
  </span>
);

function DetailSection({ icon, title, fields }: DetailSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-black text-slate-900">{title}</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-widest text-slate-500">
              {field.label}
            </label>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
              {field.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function DeviceDetailsModal({ isOpen, onClose, deviceId }: DeviceDetailsModalProps) {
  const {
    data,
    error,
    isError,
    isFetching,
    isLoading,
    refetch,
  } = useGetGpsDeviceQuery(deviceId, {
    skip: !deviceId || !isOpen,
    refetchOnMountOrArgChange: true,
  });

  const device = useMemo(() => extractGpsDeviceDetails(data), [data]);
  const inventory = useMemo(() => getInventory(device), [device]);
  const configuration = useMemo(() => getConfiguration(device), [device]);

  const connectionStatus = getConnectionStatus(device);
  const errorMessage = isError ? getApiErrorMessage(error, "Failed to load device details.") : "";

  const identityFields = [
    { label: "IMEI", value: <span className="font-mono">{pickFirstText(device?.imei)}</span> },
    { label: "Device Model", value: pickFirstText(device?.deviceModel, device?.model) },
    { label: "Manufacturer", value: pickFirstText(device?.manufacturer) },
    { label: "SIM Number", value: pickFirstText(device?.simNumber) },
    { label: "Serial Number", value: pickFirstText(device?.serialNumber) },
    { label: "Vendor ID", value: pickFirstText(device?.vendorId) },
  ];

  const assignmentFields = [
    { label: "Organization", value: getOrganizationLabel(device) },
    { label: "Assigned Vehicle", value: getVehicleLabel(device) },
    { label: "Vehicle Registration Number", value: getVehicleRegistration(device) },
  ];

  const connectivityFields = [
    {
      label: "Connection Status",
      value: renderBadge(connectionStatus, getConnectionBadgeTone(connectionStatus)),
    },
    {
      label: "Is Online",
      value:
        device?.isOnline === true
          ? renderBadge("Online", "border-emerald-200 bg-emerald-50 text-emerald-700")
          : device?.isOnline === false
            ? renderBadge("Offline", "border-rose-200 bg-rose-50 text-rose-700")
            : EMPTY_VALUE,
    },
    { label: "Last Seen", value: formatDateValue(device?.lastSeen) },
    { label: "Last Login Time", value: formatDateValue(device?.lastLoginTime) },
  ];

  const versionFields = [
    { label: "Software Version", value: pickFirstText(device?.softwareVersion) },
    { label: "Firmware Version", value: pickFirstText(device?.firmwareVersion) },
    { label: "Hardware Version", value: pickFirstText(device?.hardwareVersion) },
  ];

  const inventoryFields = [
    {
      label: "Inventory Status",
      value:
        typeof inventory?.status === "string" && inventory.status
          ? formatInventoryStatus(inventory.status)
          : EMPTY_VALUE,
    },
    { label: "Purchase Date", value: formatDateValue(inventory?.purchaseDate) },
    { label: "Purchase Price", value: formatCurrency(inventory?.purchasePrice) },
    { label: "Supplier Name", value: pickFirstText(inventory?.supplierName) },
    { label: "Invoice Number", value: pickFirstText(inventory?.invoiceNumber) },
    { label: "Stock Location", value: pickFirstText(inventory?.stockLocation) },
    { label: "Rack Number", value: pickFirstText(inventory?.rackNumber) },
    { label: "Fault Reason", value: pickFirstText(inventory?.faultReason) },
    { label: "Repair Status", value: pickFirstText(inventory?.repairStatus) },
    { label: "Last Audit At", value: formatDateValue(inventory?.lastAuditAt) },
    { label: "Inventory Updated At", value: formatDateValue(inventory?.updatedAt) },
    {
      label: "Inventory Updated By",
      value: inventory?.updatedBy ? formatUpdatedBy(inventory.updatedBy) : EMPTY_VALUE,
    },
  ];

  const configurationFields = [
    { label: "APN", value: pickFirstText(configuration?.apn) },
    { label: "Update Rate Ignition On", value: pickFirstText(configuration?.updateRateIgnitionOn as DetailValue) },
    { label: "Update Rate Ignition Off", value: pickFirstText(configuration?.updateRateIgnitionOff as DetailValue) },
    { label: "Update Rate Sleep Mode", value: pickFirstText(configuration?.updateRateSleepMode as DetailValue) },
    { label: "Update Rate Emergency", value: pickFirstText(configuration?.updateRateEmergency as DetailValue) },
    { label: "Update Rate Health", value: pickFirstText(configuration?.updateRateHealth as DetailValue) },
    { label: "Speed Limit", value: pickFirstText(configuration?.speedLimit as DetailValue) },
    { label: "Harsh Brake Threshold", value: pickFirstText(configuration?.harshBrakeThreshold as DetailValue) },
    {
      label: "Harsh Acceleration Threshold",
      value: pickFirstText(configuration?.harshAccelerationThreshold as DetailValue),
    },
    { label: "Rash Turning Threshold", value: pickFirstText(configuration?.rashTurningThreshold as DetailValue) },
    { label: "Low Battery Threshold", value: pickFirstText(configuration?.lowBatteryThreshold as DetailValue) },
    { label: "Tilt Angle", value: pickFirstText(configuration?.tiltAngle as DetailValue) },
    { label: "Sleep Time", value: pickFirstText(configuration?.sleepTime as DetailValue) },
    {
      label: "Turn By Turn Tracking",
      value: booleanLabel(configuration?.turnByTurnTracking, "Enabled", "Disabled"),
    },
    {
      label: "Relay Enabled",
      value: booleanLabel(configuration?.relayEnabled, "Enabled", "Disabled"),
    },
    {
      label: "Box Event Disabled",
      value: booleanLabel(configuration?.boxEventDisabled, "Disabled", "Enabled"),
    },
    {
      label: "SMS Enabled",
      value: booleanLabel(configuration?.smsEnabled, "Enabled", "Disabled"),
    },
  ];

  const auditFields = [
    {
      label: "Status",
      value:
        typeof device?.status === "string" && device.status
          ? renderBadge(formatStatus(device.status), getDeviceStatusBadgeTone(device.status))
          : EMPTY_VALUE,
    },
    { label: "Created At", value: formatDateValue(device?.createdAt) },
    { label: "Updated At", value: formatDateValue(device?.updatedAt) },
  ];

  return (
    <SimpleModal isOpen={isOpen} onClose={onClose} title="Device Details" size="large">
      <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-4 sm:p-6">
        {isLoading && !device ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold">Loading real device details...</p>
          </div>
        ) : null}

        {isError ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-black uppercase tracking-widest">Unable To Load Device Details</p>
                  <p className="mt-1 text-sm">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-700 transition hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {!isLoading && !isError && !device ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            The backend returned no device detail payload for this selection.
          </div>
        ) : null}

        {!isError && device ? (
          <div className="space-y-6">
            {isFetching && !isLoading ? (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Refreshing device details from the backend...
              </div>
            ) : null}

            <DetailSection
              icon={<Smartphone className="text-blue-600" size={20} />}
              title="Identity"
              fields={identityFields}
            />
            <DetailSection
              icon={<Building2 className="text-green-600" size={20} />}
              title="Assignment"
              fields={assignmentFields}
            />
            <DetailSection
              icon={<Shield className="text-purple-600" size={20} />}
              title="Connectivity"
              fields={connectivityFields}
            />
            <DetailSection
              icon={<Package className="text-orange-600" size={20} />}
              title="Versions"
              fields={versionFields}
            />
            <DetailSection
              icon={<Package className="text-amber-600" size={20} />}
              title="Inventory"
              fields={inventoryFields}
            />
            <DetailSection
              icon={<Settings className="text-indigo-600" size={20} />}
              title="Configuration"
              fields={configurationFields}
            />
            <DetailSection
              icon={<Info className="text-cyan-600" size={20} />}
              title="Device Status / Audit"
              fields={auditFields}
            />
          </div>
        ) : null}
      </div>
    </SimpleModal>
  );
}
