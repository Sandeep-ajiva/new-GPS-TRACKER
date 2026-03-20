"use client";

import { useMemo } from "react";
import { Building2, Clock3, MapPin, Phone, Shield } from "lucide-react";
import { useGetOrganizationQuery } from "@/redux/api/organizationApi";
import {
  DetailModalFrame,
  DetailSection,
  EMPTY_VALUE,
  asRecord,
  formatAddressValue,
  formatDateValue,
  getEntityLabel,
  hasOwn,
  hasValue,
  pickFirstText,
  readText,
  renderBadge,
  toStatusLabel,
  unwrapDataRecord,
} from "./detailModalShared";

type OrganizationLookup = {
  _id: string;
  name: string;
  parentOrganizationId?: string | null;
};

interface OrganizationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationLookup?: OrganizationLookup[];
}

const getLookupName = (items: OrganizationLookup[], id: unknown) => {
  if (typeof id !== "string" || !id.trim()) {
    return EMPTY_VALUE;
  }

  return items.find((item) => item._id === id)?.name || id;
};

export default function OrganizationDetailsModal({
  isOpen,
  onClose,
  organizationId,
  organizationLookup = [],
}: OrganizationDetailsModalProps) {
  const { data, error, isError, isFetching, refetch } = useGetOrganizationQuery(organizationId, {
    skip: !isOpen || !organizationId,
    refetchOnMountOrArgChange: true,
  });

  const organization = useMemo(() => unwrapDataRecord(data), [data]);
  const address = asRecord(organization?.address);
  const geo = asRecord(organization?.geo);
  const settings = asRecord(organization?.settings);
  const stats = asRecord(organization?.stats);
  const summary = asRecord(organization?.summary);

  const parentLabel = (() => {
    const parent = organization?.parentOrganizationId;
    return getEntityLabel(parent, getLookupName(organizationLookup, parent));
  })();

  const contactLabel = pickFirstText(
    organization?.contactPerson,
    organization?.contactName,
    organization?.adminName,
    organization?.adminUserName,
  );

  const createdByLabel = getEntityLabel(organization?.createdBy);
  const totalUsers = pickFirstText(
    stats?.totalUsers,
    summary?.totalUsers,
    organization?.totalUsers,
    organization?.userCount,
  );
  const totalVehicles = pickFirstText(
    stats?.totalVehicles,
    summary?.totalVehicles,
    organization?.totalVehicles,
    organization?.vehicleCount,
  );
  const totalGpsDevices = pickFirstText(
    stats?.totalGpsDevices,
    stats?.totalDevices,
    summary?.totalGpsDevices,
    organization?.totalGpsDevices,
    organization?.deviceCount,
  );

  const overviewFields = [
    { label: "Organization Name", value: readText(organization?.name) },
    ...(hasValue(organization?.path)
      ? [{ label: "Code / Slug", value: readText(organization?.path) }]
      : []),
    ...(parentLabel !== EMPTY_VALUE
      ? [{ label: "Parent Organization", value: parentLabel }]
      : []),
    {
      label: "Status",
      value: renderBadge(toStatusLabel(organization?.status), undefined),
    },
  ];

  const contactFields = [
    ...(contactLabel !== EMPTY_VALUE ? [{ label: "Contact Person", value: contactLabel }] : []),
    { label: "Contact Email", value: readText(organization?.email) },
    { label: "Contact Phone", value: readText(organization?.phone) },
  ];

  const locationFields = [
    ...(hasOwn(organization ?? {}, "address") || formatAddressValue(address) !== EMPTY_VALUE
      ? [{ label: "Address", value: formatAddressValue(address) }]
      : []),
    ...(hasValue(address?.city) ? [{ label: "City", value: readText(address?.city) }] : []),
    ...(hasValue(address?.state) ? [{ label: "State", value: readText(address?.state) }] : []),
    ...(hasValue(address?.country)
      ? [{ label: "Country", value: readText(address?.country) }]
      : []),
    ...(hasValue(address?.pincode)
      ? [{ label: "Postal Code", value: readText(address?.pincode) }]
      : []),
    ...(hasValue(geo?.timezone)
      ? [{ label: "Timezone", value: readText(geo?.timezone) }]
      : []),
  ];

  const metricsFields = [
    ...(totalUsers !== EMPTY_VALUE ? [{ label: "Total Users", value: totalUsers }] : []),
    ...(totalVehicles !== EMPTY_VALUE ? [{ label: "Total Vehicles", value: totalVehicles }] : []),
    ...(totalGpsDevices !== EMPTY_VALUE
      ? [{ label: "Total GPS Devices", value: totalGpsDevices }]
      : []),
    ...(hasValue(settings?.speedLimit)
      ? [{ label: "Configured Speed Limit", value: readText(settings?.speedLimit) }]
      : []),
  ];

  const auditFields = [
    ...(createdByLabel !== EMPTY_VALUE ? [{ label: "Created By", value: createdByLabel }] : []),
    ...(hasOwn(organization ?? {}, "createdAt")
      ? [{ label: "Created At", value: formatDateValue(organization?.createdAt) }]
      : []),
    ...(hasOwn(organization ?? {}, "updatedAt")
      ? [{ label: "Updated At", value: formatDateValue(organization?.updatedAt) }]
      : []),
  ];

  return (
    <DetailModalFrame
      isOpen={isOpen}
      onClose={onClose}
      title="Organization Details"
      isLoading={isFetching}
      isError={isError}
      error={error}
      onRetry={refetch}
    >
      <DetailSection
        icon={<Building2 className="h-5 w-5 text-slate-700" />}
        title="Overview"
        fields={overviewFields}
      />
      <DetailSection
        icon={<Phone className="h-5 w-5 text-slate-700" />}
        title="Contact"
        fields={contactFields}
      />
      <DetailSection
        icon={<MapPin className="h-5 w-5 text-slate-700" />}
        title="Location"
        fields={locationFields}
      />
      <DetailSection
        icon={<Shield className="h-5 w-5 text-slate-700" />}
        title="Operational Summary"
        fields={metricsFields}
      />
      <DetailSection
        icon={<Clock3 className="h-5 w-5 text-slate-700" />}
        title="Audit"
        fields={auditFields}
      />
    </DetailModalFrame>
  );
}
