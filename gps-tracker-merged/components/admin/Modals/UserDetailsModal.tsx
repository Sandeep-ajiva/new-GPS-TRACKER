"use client";

import { useMemo } from "react";
import { Building2, Clock3, Shield, UserRound } from "lucide-react";
import { useGetUserQuery } from "@/redux/api/usersApi";
import {
  DetailModalFrame,
  DetailSection,
  EMPTY_VALUE,
  asRecord,
  formatDateValue,
  formatBooleanLabel,
  getEntityLabel,
  getFullName,
  pickFirstText,
  readText,
  renderBadge,
  toStatusLabel,
  unwrapDataRecord,
} from "./detailModalShared";

interface UserDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function UserDetailsModal({
  isOpen,
  onClose,
  userId,
}: UserDetailsModalProps) {
  const { data, error, isError, isFetching, refetch } = useGetUserQuery(userId, {
    skip: !isOpen || !userId,
    refetchOnMountOrArgChange: true,
  });

  const user = useMemo(() => unwrapDataRecord(data), [data]);
  const organization = asRecord(user?.organizationId);
  const assignedVehicle = getEntityLabel(user?.assignedVehicleId);
  const linkedDriver = getEntityLabel(user?.driverId);
  const parentOrganization = getEntityLabel(organization?.parentOrganizationId);
  const permissionsSummary = pickFirstText(
    user?.permissionsSummary,
    user?.permissionSummary,
    user?.permissions,
  );
  const address = pickFirstText(user?.address, user?.addressLine);
  const username = pickFirstText(user?.username, user?.userName);
  const lastLogin = pickFirstText(user?.lastLoginAt, user?.lastLoginTime);

  return (
    <DetailModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="User Details"
      isLoading={isFetching}
      isError={isError}
      error={error}
      onRetry={refetch}
    >
      <DetailSection
        icon={<UserRound className="h-5 w-5 text-slate-700" />}
        title="Identity"
        fields={[
          { label: "Full Name", value: getFullName(user) },
          ...(username !== EMPTY_VALUE ? [{ label: "Username", value: username }] : []),
          { label: "Email", value: readText(user?.email) },
          { label: "Phone", value: readText(user?.mobile) },
          ...(address !== EMPTY_VALUE ? [{ label: "Address", value: address }] : []),
        ]}
      />
      <DetailSection
        icon={<Building2 className="h-5 w-5 text-slate-700" />}
        title="Organization"
        fields={[
          { label: "Organization", value: getEntityLabel(user?.organizationId) },
          ...(parentOrganization !== EMPTY_VALUE
            ? [{ label: "Parent Organization", value: parentOrganization }]
            : []),
          ...(assignedVehicle !== EMPTY_VALUE
            ? [{ label: "Assigned Vehicle", value: assignedVehicle }]
            : []),
          ...(linkedDriver !== EMPTY_VALUE
            ? [{ label: "Linked Driver Profile", value: linkedDriver }]
            : []),
        ]}
      />
      <DetailSection
        icon={<Shield className="h-5 w-5 text-slate-700" />}
        title="Access"
        fields={[
          { label: "Role", value: renderBadge(toStatusLabel(user?.role)) },
          { label: "Status", value: renderBadge(toStatusLabel(user?.status)) },
          ...(permissionsSummary !== EMPTY_VALUE
            ? [{ label: "Permissions Summary", value: permissionsSummary }]
            : []),
          ...(readText(user?.isVerified) !== EMPTY_VALUE || user?.isVerified === false
            ? [{ label: "Verified", value: formatBooleanLabel(user?.isVerified) }]
            : []),
          ...(lastLogin !== EMPTY_VALUE
            ? [{ label: "Last Login", value: formatDateValue(lastLogin) }]
            : []),
        ]}
      />
      <DetailSection
        icon={<Clock3 className="h-5 w-5 text-slate-700" />}
        title="Audit"
        fields={[
          { label: "Created At", value: formatDateValue(user?.createdAt) },
          { label: "Updated At", value: formatDateValue(user?.updatedAt) },
          ...(getEntityLabel(user?.createdBy) !== EMPTY_VALUE
            ? [{ label: "Created By", value: getEntityLabel(user?.createdBy) }]
            : []),
        ]}
      />
    </DetailModalFrame>
  );
}
