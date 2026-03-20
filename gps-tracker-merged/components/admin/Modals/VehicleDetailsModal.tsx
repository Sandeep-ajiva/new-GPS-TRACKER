"use client";

import { useMemo } from "react";
import { Building2, Car, Clock3, Shield, UserRound } from "lucide-react";
import { useGetVehicleQuery } from "@/redux/api/vehicleApi";
import {
  DetailModalFrame,
  DetailSection,
  EMPTY_VALUE,
  asRecord,
  formatDateValue,
  getEntityLabel,
  pickFirstText,
  readText,
  renderBadge,
  toStatusLabel,
  unwrapDataRecord,
} from "./detailModalShared";

type NamedLookup = {
  _id: string;
  name?: string;
  imei?: string;
  vehicleNumber?: string;
};

interface VehicleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  organizationLookup?: NamedLookup[];
  deviceLookup?: NamedLookup[];
}

const lookupValue = (
  items: NamedLookup[],
  id: unknown,
  keys: Array<keyof NamedLookup>,
) => {
  if (typeof id !== "string" || !id.trim()) {
    return EMPTY_VALUE;
  }

  const item = items.find((entry) => entry._id === id);
  if (!item) return id;

  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return id;
};

export default function VehicleDetailsModal({
  isOpen,
  onClose,
  vehicleId,
  organizationLookup = [],
  deviceLookup = [],
}: VehicleDetailsModalProps) {
  const { data, error, isError, isFetching, refetch } = useGetVehicleQuery(vehicleId, {
    skip: !isOpen || !vehicleId,
    refetchOnMountOrArgChange: true,
  });

  const vehicle = useMemo(() => unwrapDataRecord(data), [data]);
  const organizationLabel = getEntityLabel(
    vehicle?.organizationId,
    lookupValue(organizationLookup, vehicle?.organizationId, ["name"]),
  );
  const driverLabel = getEntityLabel(vehicle?.driverId);
  const deviceLabel = getEntityLabel(
    vehicle?.deviceId,
    lookupValue(deviceLookup, vehicle?.deviceId, ["imei", "name"]),
  );
  const liveStatus = pickFirstText(vehicle?.runningStatus, vehicle?.currentStatus, vehicle?.liveStatus);
  const location = asRecord(vehicle?.currentLocation);

  return (
    <DetailModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Vehicle Details"
      isLoading={isFetching}
      isError={isError}
      error={error}
      onRetry={refetch}
    >
      <DetailSection
        icon={<Car className="h-5 w-5 text-slate-700" />}
        title="Identity"
        fields={[
          { label: "Vehicle Number", value: readText(vehicle?.vehicleNumber) },
          ...(readText(vehicle?.registrationNumber) !== EMPTY_VALUE
            ? [{ label: "Registration Number", value: readText(vehicle?.registrationNumber) }]
            : []),
          { label: "Vehicle Type", value: toStatusLabel(vehicle?.vehicleType) },
          ...(readText(vehicle?.make) !== EMPTY_VALUE
            ? [{ label: "Make", value: readText(vehicle?.make) }]
            : []),
          { label: "Model", value: readText(vehicle?.model) },
        ]}
      />
      <DetailSection
        icon={<Building2 className="h-5 w-5 text-slate-700" />}
        title="Assignment"
        fields={[
          { label: "Organization", value: organizationLabel },
          { label: "Assigned GPS Device", value: deviceLabel },
          { label: "Assigned Driver", value: driverLabel },
        ]}
      />
      <DetailSection
        icon={<Shield className="h-5 w-5 text-slate-700" />}
        title="Specifications"
        fields={[
          ...(readText(vehicle?.fuelType) !== EMPTY_VALUE
            ? [{ label: "Fuel Type", value: readText(vehicle?.fuelType) }]
            : []),
          ...(readText(vehicle?.chassisNumber) !== EMPTY_VALUE
            ? [{ label: "Chassis Number", value: readText(vehicle?.chassisNumber) }]
            : []),
          ...(readText(vehicle?.engineNumber) !== EMPTY_VALUE
            ? [{ label: "Engine Number", value: readText(vehicle?.engineNumber) }]
            : []),
          { label: "Year", value: readText(vehicle?.year) },
          { label: "Color", value: readText(vehicle?.color) },
          ...(readText(location?.address) !== EMPTY_VALUE
            ? [{ label: "Current Location", value: readText(location?.address) }]
            : []),
        ]}
      />
      <DetailSection
        icon={<UserRound className="h-5 w-5 text-slate-700" />}
        title="Status"
        fields={[
          { label: "Status", value: renderBadge(toStatusLabel(vehicle?.status)) },
          ...(liveStatus !== EMPTY_VALUE
            ? [{ label: "Current Live Status", value: renderBadge(toStatusLabel(liveStatus)) }]
            : []),
          ...(formatDateValue(vehicle?.lastUpdated) !== EMPTY_VALUE
            ? [{ label: "Last Updated", value: formatDateValue(vehicle?.lastUpdated) }]
            : []),
        ]}
      />
      <DetailSection
        icon={<Clock3 className="h-5 w-5 text-slate-700" />}
        title="Audit"
        fields={[
          { label: "Created At", value: formatDateValue(vehicle?.createdAt) },
          { label: "Updated At", value: formatDateValue(vehicle?.updatedAt) },
        ]}
      />
    </DetailModalFrame>
  );
}
