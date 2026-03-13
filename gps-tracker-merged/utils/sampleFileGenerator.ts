import ExcelJS from "exceljs";

export interface SampleGeneratorOptions {
  moduleName: string;
  allowedFields: string[];
  requiredFields: string[];
  format: "csv" | "excel";
}

const MODULE_SAMPLE_ROWS: Record<string, Record<string, string>> = {
  organizations: {
    name: "North Fleet Logistics",
    organizationType: "logistics",
    email: "northfleet@example.com",
    phone: "+919876543210",
    addressLine: "101 Industrial Park",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    pincode: "400001",
    parentOrganizationName: "Ajiva Group",
    status: "active",
  },
  users: {
    organizationName: "North Fleet Logistics",
    firstName: "Amit",
    lastName: "Sharma",
    email: "amit.sharma@example.com",
    mobile: "+919876543211",
    role: "admin",
    status: "active",
    password: "Secret123",
  },
  vehicles: {
    organizationName: "North Fleet Logistics",
    vehicleType: "truck",
    vehicleNumber: "MH12AB1234",
    ais140Compliant: "true",
    ais140CertificateNumber: "CERT000001",
    make: "Tata",
    model: "Ace Gold",
    year: "2024",
    color: "White",
    status: "active",
    runningStatus: "inactive",
    lastUpdated: "2026-03-13T09:30:00.000Z",
    deviceImei: "123456789012345",
  },
  devices: {
    organizationName: "North Fleet Logistics",
    imei: "123456789012345",
    softwareVersion: "1.0.4",
    vendorId: "ROADRPA",
    deviceModel: "RX-100",
    manufacturer: "Ajiva Devices",
    simNumber: "+919876543212",
    serialNumber: "SN-0001",
    firmwareVersion: "1.0.4",
    hardwareVersion: "HW-2",
    warrantyExpiry: "2027-03-13",
    status: "active",
    vehicleRegistrationNumber: "MH12AB1234",
  },
  drivers: {
    organizationName: "North Fleet Logistics",
    firstName: "Rohit",
    lastName: "Kumar",
    email: "rohit.kumar@example.com",
    phone: "+919876543213",
    licenseNumber: "DL01AB1234",
    licenseExpiry: "2027-06-01",
    status: "active",
    password: "Secret123",
  },
};

function buildRow(moduleName: string, allowedFields: string[]) {
  const sample = MODULE_SAMPLE_ROWS[moduleName] || {};
  return allowedFields.map((field) => sample[field] || "");
}

function downloadBlob(blob: Blob, fileName: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function generateCsvSample(options: SampleGeneratorOptions) {
  const headers = options.allowedFields.join(",");
  const row = buildRow(options.moduleName, options.allowedFields)
    .map((value) => {
      if (/[",\n]/.test(value)) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    })
    .join(",");

  const blob = new Blob([[headers, row].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  downloadBlob(blob, `${options.moduleName}-template.csv`);
}

async function generateExcelSample(options: SampleGeneratorOptions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${options.moduleName} Template`);

  worksheet.columns = options.allowedFields.map((field) => ({
    header: field,
    key: field,
    width: Math.max(field.length + 4, 18),
  }));

  const rowData: Record<string, string> = {};
  options.allowedFields.forEach((field, index) => {
    rowData[field] = buildRow(options.moduleName, options.allowedFields)[index];
  });
  worksheet.addRow(rowData);

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE2E8F0" },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${options.moduleName}-template.xlsx`);
}

export async function generateSampleFile(options: SampleGeneratorOptions) {
  if (options.format === "csv") {
    await generateCsvSample(options);
    return;
  }

  await generateExcelSample(options);
}
