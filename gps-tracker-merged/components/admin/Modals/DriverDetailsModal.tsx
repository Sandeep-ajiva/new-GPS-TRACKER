"use client";

import { useMemo } from "react";
import { Building2, Car, Clock3, IdCard, UserRound } from "lucide-react";
import { useGetDriverQuery } from "@/redux/api/driversApi";
import {
  DetailModalFrame,
  DetailSection,
  EMPTY_VALUE,
  formatBooleanLabel,
  formatDateValue,
  getEntityLabel,
  getFullName,
  pickFirstText,
  readText,
  renderBadge,
  toStatusLabel,
  unwrapDataRecord,
} from "./detailModalShared";

interface DriverDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverId: string;
}

export default function DriverDetailsModal({
  isOpen,
  onClose,
  driverId,
}: DriverDetailsModalProps) {
  const { data, error, isError, isFetching, refetch } = useGetDriverQuery(driverId, {
    skip: !isOpen || !driverId,
    refetchOnMountOrArgChange: true,
  });

  const driver = useMemo(() => unwrapDataRecord(data), [data]);
  const assignedVehicle = getEntityLabel(driver?.assignedVehicleId);
  const emergencyContact = pickFirstText(
    driver?.emergencyContact,
    driver?.emergencyPhone,
    driver?.emergencyContactNumber,
  );

  return (
    <DetailModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Driver Details"
      isLoading={isFetching}
      isError={isError}
      error={error}
      onRetry={refetch}
    >
      <DetailSection
        icon={<UserRound className="h-5 w-5 text-slate-700" />}
        title="Identity"
        fields={[
          { label: "Driver Name", value: getFullName(driver) },
          ...(pickFirstText(driver?.employeeId, driver?.driverId) !== EMPTY_VALUE
            ? [{ label: "Driver ID", value: pickFirstText(driver?.employeeId, driver?.driverId) }]
            : []),
          { label: "Phone Number", value: readText(driver?.phone) },
          { label: "Email", value: readText(driver?.email) },
          { label: "Address", value: readText(driver?.address) },
          ...(emergencyContact !== EMPTY_VALUE
            ? [{ label: "Emergency Contact", value: emergencyContact }]
            : []),
        ]}
      />
      <DetailSection
        icon={<IdCard className="h-5 w-5 text-slate-700" />}
        title="Licensing"
        fields={[
          { label: "License Number", value: readText(driver?.licenseNumber) },
          { label: "License Expiry", value: formatDateValue(driver?.licenseExpiry) },
        ]}
      />
      <DetailSection
        icon={<Building2 className="h-5 w-5 text-slate-700" />}
        title="Assignment"
        fields={[
          { label: "Organization", value: getEntityLabel(driver?.organizationId) },
          { label: "Assigned Vehicle", value: assignedVehicle },
          ...(driver?.availability !== undefined
            ? [{ label: "Available", value: formatBooleanLabel(driver?.availability) }]
            : []),
          ...(readText(driver?.totalTrips) !== EMPTY_VALUE
            ? [{ label: "Total Trips", value: readText(driver?.totalTrips) }]
            : []),
        ]}
      />
      <DetailSection
        icon={<Car className="h-5 w-5 text-slate-700" />}
        title="Status"
        fields={[
          { label: "Status", value: renderBadge(toStatusLabel(driver?.status)) },
          ...(readText(driver?.rating) !== EMPTY_VALUE
            ? [{ label: "Rating", value: readText(driver?.rating) }]
            : []),
          ...(formatDateValue(driver?.joiningDate) !== EMPTY_VALUE
            ? [{ label: "Joining Date", value: formatDateValue(driver?.joiningDate) }]
            : []),
        ]}
      />
      <DetailSection
        icon={<Clock3 className="h-5 w-5 text-slate-700" />}
        title="Audit"
        fields={[
          { label: "Created At", value: formatDateValue(driver?.createdAt) },
          { label: "Updated At", value: formatDateValue(driver?.updatedAt) },
        ]}
      />
    </DetailModalFrame>
  );
}
