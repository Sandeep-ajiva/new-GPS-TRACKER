export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_IMPORT_FILE_SIZE_LABEL = "25MB";
export const IMPORT_ACCEPT_ATTRIBUTE = ".csv,.xlsx,.xls";

export const DEVICE_IMPORT_FIELDS = [
  "organizationId",
  "organizationName",
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
] as const;
