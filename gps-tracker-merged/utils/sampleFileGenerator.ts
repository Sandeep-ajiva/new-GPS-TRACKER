import ExcelJS from "exceljs";

export interface FieldConfig {
  key: string;
  header?: string;
  required?: boolean;
  example?: string;
}

export interface SampleGeneratorOptions {
  moduleName: string;
  allowedFields: string[];
  requiredFields: string[];
  format: "csv" | "excel";
  rows?: number;
}

/**
 * Generate example data for a field based on its name
 */
function generateExampleData(fieldKey: string, fieldName: string, rowIndex: number = 0): string {
  const key = fieldKey.toLowerCase();
  
  // Email fields
  if (key.includes("email")) {
    return `user${rowIndex + 1}@example.com`;
  }
  
  // Phone fields
  if (key.includes("phone") || key.includes("mobile")) {
    return `+91${9876543210 + rowIndex}`;
  }
  
  // Date fields
  if (key.includes("date") || key.includes("created") || key.includes("updated")) {
    const date = new Date();
    date.setDate(date.getDate() + rowIndex);
    return date.toISOString().split('T')[0];
  }
  
  // ID fields
  if (key.includes("id") && !key.includes("name")) {
    return `${123456789012345 + rowIndex}`;
  }
  
  // Status fields
  if (key.includes("status")) {
    return rowIndex % 2 === 0 ? "active" : "inactive";
  }
  
  // Type fields
  if (key.includes("type")) {
    if (key.includes("organization")) return rowIndex % 2 === 0 ? "parent" : "sub";
    if (key.includes("vehicle")) return ["truck", "bus", "van", "motorcycle"][rowIndex % 4];
    return "standard";
  }
  
  // Number fields
  if (key.includes("number")) {
    return `DL${String(rowIndex + 1).padStart(2, '0')}AB${1234 + rowIndex}`;
  }
  
  // Name fields
  if (key.includes("name")) {
    if (key.includes("first")) return ["John", "Jane", "Robert", "Alice"][rowIndex % 4];
    if (key.includes("last")) return ["Doe", "Smith", "Johnson", "Williams"][rowIndex % 4];
    return ["Example Corp", "Tech Solutions", "Global Services", "Transport Co"][rowIndex % 4];
  }
  
  // Address fields
  if (key.includes("address") || key.includes("city") || key.includes("state") || key.includes("country") || key.includes("pincode")) {
    if (key.includes("addressline") || key.includes("address")) return `${123 + rowIndex} Business Ave, Sector ${rowIndex + 1}`;
    if (key.includes("city")) return ["Chandigarh", "Delhi", "Mumbai", "Bangalore"][rowIndex % 4];
    if (key.includes("state")) return ["Punjab", "Delhi", "Maharashtra", "Karnataka"][rowIndex % 4];
    if (key.includes("country")) return "India";
    if (key.includes("pincode")) return `${160001 + rowIndex}`;
    return "123 Business Ave";
  }
  
  // Organization fields
  if (key.includes("organization")) {
    return ["Ajiva Group", "Tech Solutions", "Global Services", "Transport Co"][rowIndex % 4];
  }
  
  // Vehicle fields
  if (key.includes("vehicle")) {
    if (key.includes("type")) return ["truck", "bus", "van", "motorcycle"][rowIndex % 4];
    if (key.includes("make")) return ["Tata", "Ashok Leyland", "Mahindra", "Eicher"][rowIndex % 4];
    if (key.includes("model")) return ["Ace", "Bus", "Cargo", "Mini"][rowIndex % 4];
    if (key.includes("color")) return ["Blue", "Red", "Green", "White"][rowIndex % 4];
    if (key.includes("year")) return String(2020 + (rowIndex % 4));
    return "Vehicle Data";
  }
  
  // Device fields
  if (key.includes("device") || key.includes("imei")) {
    if (key.includes("sim")) return `+91${9876543210 + rowIndex}`;
    if (key.includes("phone")) return `+91${9876543210 + rowIndex}`;
    return `${123456789012345 + rowIndex}`;
  }
  
  // Driver fields
  if (key.includes("driver")) {
    if (key.includes("license")) return `DL${String(rowIndex + 1).padStart(2, '0')}AB${1234 + rowIndex}`;
    if (key.includes("first")) return ["Rajesh", "Amit", "Prem", "Vijay"][rowIndex % 4];
    if (key.includes("last")) return ["Kumar", "Sharma", "Singh", "Kumar"][rowIndex % 4];
    return ["Driver Name", "Driver Name", "Driver Name", "Driver Name"][rowIndex % 4];
  }
  
  // Certificate fields
  if (key.includes("certificate")) {
    return `CERT${String(rowIndex + 1).padStart(6, '0')}`;
  }
  
  // Compliance fields
  if (key.includes("compliant")) {
    return rowIndex % 2 === 0 ? "true" : "false";
  }
  
  // Boolean fields
  if (key.includes("active") || key.includes("enabled") || key.includes("verified")) {
    return rowIndex % 2 === 0 ? "true" : "false";
  }
  
  // Default fallback
  return `Example Value ${rowIndex + 1}`;
}

/**
 * Generate CSV sample file
 */
export async function generateCSVSample(options: SampleGeneratorOptions): Promise<void> {
  const { moduleName, allowedFields, requiredFields, format, rows = 2 } = options;
  
  // Generate headers
  const headers = allowedFields;
  
  // Generate sample rows
  const sampleRows = [];
  for (let i = 0; i < rows; i++) {
    const row = allowedFields.map(field => generateExampleData(field, field, i));
    sampleRows.push(row);
  }
  
  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...sampleRows.map(row => row.join(","))
  ].join("\n");
  
  // Download file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${moduleName.toLowerCase()}_sample.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Excel sample file
 */
export async function generateExcelSample(options: SampleGeneratorOptions): Promise<void> {
  const { moduleName, allowedFields, requiredFields, format, rows = 2 } = options;
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`${moduleName} Sample`);
  
  // Add headers
  worksheet.columns = allowedFields.map(field => ({
    header: field,
    key: field,
    width: 20
  }));
  
  // Add sample rows
  for (let i = 0; i < rows; i++) {
    const rowData: Record<string, any> = {};
    allowedFields.forEach(field => {
      rowData[field] = generateExampleData(field, field);
    });
    worksheet.addRow(rowData);
  }
  
  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE6E6FA' }
  };
  
  // Generate and download Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" 
  });
  
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${moduleName.toLowerCase()}_sample.xlsx`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Main sample file generator function
 */
export async function generateSampleFile(options: SampleGeneratorOptions): Promise<void> {
  if (options.format === "csv") {
    await generateCSVSample(options);
  } else if (options.format === "excel") {
    await generateExcelSample(options);
  } else {
    throw new Error(`Unsupported format: ${options.format}`);
  }
}
