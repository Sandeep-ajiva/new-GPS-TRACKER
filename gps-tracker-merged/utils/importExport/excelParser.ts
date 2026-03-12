import * as XLSX from "xlsx";

function getBufferFromFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as ArrayBuffer);
      } else {
        reject(new Error("Failed to read file as ArrayBuffer"));
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

export async function parseExcelHeaders(file: File): Promise<string[]> {
  console.log("parseExcelHeaders starting for:", file.name);
  try {
    const buffer = await getBufferFromFile(file);
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read all rows but grab the first row
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    console.log("Raw Excel Data (first 3 rows):", data.slice(0, 3));

    // Find the first row that actually has strings in it
    const headerRow = data.find(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ""));

    if (!headerRow || headerRow.length === 0) {
      console.error("No header row found in Excel");
      throw new Error("Excel file must contain a header row");
    }

    const headers = headerRow.map((h) => (h !== undefined && h !== null ? String(h).trim() : ""));
    console.log("Extracted Headers:", headers);
    return headers;
  } catch (error: any) {
    console.error("parseExcelHeaders error:", error);
    throw new Error(`Parse Headers Error: ${error?.message || "Unknown error"}`);
  }
}

export async function parseExcelRows(file: File) {
  console.log("parseExcelRows starting for:", file.name);
  try {
    const buffer = await getBufferFromFile(file);
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Find the actual header row index to tell XLSX where the data starts
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    const headerRowIndex = rawData.findIndex(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ""));

    if (headerRowIndex === -1) {
      console.error("No header row index found in Excel");
      throw new Error("Excel file must contain a header row");
    }

    console.log("Found headerRowIndex:", headerRowIndex);

    // To ensure keys are trimmed, we use the explicitly trimmed header row as keys
    const headerRow = rawData[headerRowIndex].map(h => String(h || "").trim()).filter(h => h !== "");
    
    const rows = XLSX.utils.sheet_to_json(worksheet, {
      range: headerRowIndex + 1, // Start data from the row AFTER headers
      header: headerRow,
      defval: "",
    });

    console.log("Parsed Rows Count:", rows.length);
    if (rows.length > 0) {
      console.log("First Parsed Row Keys:", Object.keys(rows[0] as any));
    }
    return rows;
  } catch (error: any) {
    console.error("parseExcelRows error:", error);
    throw new Error(`Parse Rows Error: ${error?.message || "Unknown error"}`);
  }
}
