"use client";

import { useMemo, useState, useRef } from "react";
import { Loader2, Upload, Download, X, FileText, FileSpreadsheet, ChevronLeft, ChevronRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import MappingTable from "./MappingTable";
import ValidationSummary from "./ValidationSummary";
import { runExport } from "./ExportHandler";
import { useImportExport } from "@/hooks/useImportExport";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { generateSampleFile } from "@/utils/sampleFileGenerator";
import { generateCSVExport } from "@/utils/csvExportGenerator";
import { generateExcelExport } from "@/utils/excelExportGenerator";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";
import { parseExcelHeaders, parseExcelRows } from "@/utils/importExport/excelParser";
import { useOrgContext } from "@/hooks/useOrgContext";
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi";

type ImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  moduleName: string;
  importUrl: string;
  exportUrl: string;
  allowedFields: string[];
  requiredFields: string[];
  filters?: Record<string, string | number | boolean | null | undefined>;
  onCompleted?: () => void;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXT = [".csv", ".xlsx", ".xls"];

function fileExt(name: string) {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function ImportModal({
  isOpen,
  onClose,
  moduleName,
  importUrl,
  exportUrl,
  allowedFields,
  requiredFields,
  filters,
  onCompleted,
}: ImportModalProps) {
  const { uploadFile, exportFile, loading, progress, error, reset } = useImportExport();
  const [tab, setTab] = useState<"import" | "export">("import");
  const { role, orgId, orgName, isSuperAdmin, isRootOrgAdmin } = useOrgContext();
  const { data: orgData } = useGetOrganizationsQuery({ page: 0, limit: 1000 }, { skip: !(isSuperAdmin || isRootOrgAdmin) });
  
  const [selectedOrgId, setSelectedOrgId] = useState<string>(orgId || "");
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "excel">("csv");
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");
  const [file, setFile] = useState<File | null>(null);
  const [previewTotalRows, setPreviewTotalRows] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const rowsPerPage = 10;
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: { rowNumber: number; message: string }[];
  } | null>(null);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [exportScope, setExportScope] = useState<"all" | "date">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollTable = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const amount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
    }
  };

  const isExportValid = useMemo(() => {
    if (exportScope === "all") return true;
    return !!(exportFromDate && exportToDate);
  }, [exportScope, exportFromDate, exportToDate]);

  // 🚨 Remove organizationId from mapping lists as per requirements
  const filteredAllowedFields = useMemo(() => allowedFields.filter(f => f !== "organizationId"), [allowedFields]);
  const filteredRequiredFields = useMemo(() => requiredFields.filter(f => f !== "organizationId"), [requiredFields]);

  const missingRequiredFields = useMemo(() => {
    if (Object.keys(mapping).length === 0) return [];
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    return filteredRequiredFields.filter((f) => !mapped.has(f));
  }, [mapping, filteredRequiredFields]);

  const duplicateMappedFields = useMemo(() => {
    const count = new Map<string, number>();
    Object.values(mapping)
      .filter(Boolean)
      .forEach((f) => count.set(f, (count.get(f) || 0) + 1));
    return [...count.entries()].filter(([, c]) => c > 1).length;
  }, [mapping]);

  const filteredPreviewRows = useMemo(() => {
    if (!searchQuery) return previewRows;
    const low = searchQuery.toLowerCase();
    return previewRows.filter((row) =>
      Object.values(row).some((val) => String(val).toLowerCase().includes(low))
    );
  }, [previewRows, searchQuery]);

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredPreviewRows.slice(start, start + rowsPerPage);
  }, [filteredPreviewRows, currentPage]);

  const totalPages = Math.ceil(filteredPreviewRows.length / rowsPerPage);

  const toggleExclude = (id: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  const closeAll = () => {
    setTab("import");
    setSelectedFormat("csv");
    setExportFormat("csv");
    setFile(null);
    setPreviewTotalRows(0);
    setPreviewRows([]);
    setSearchQuery("");
    setShowPreview(false);
    setExcludedIndices(new Set());
    setCsvColumns([]);
    setCurrentPage(1);
    setMapping({});
    setResult(null);
    setExportFromDate("");
    setExportToDate("");
    setExportScope("all");
    setSelectedOrgId(orgId || "");
    reset();
    onClose();
  };

  const downloadSampleCSV = async () => {
    try {
      await generateSampleFile({
        moduleName,
        allowedFields: filteredAllowedFields,
        requiredFields: filteredRequiredFields,
        format: "csv"
      });
      toast.success("Sample CSV file downloaded");
    } catch (error) {
      toast.error("Failed to download sample CSV");
      console.error("Sample CSV download error:", error);
    }
  };

  const downloadSampleExcel = async () => {
    try {
      await generateSampleFile({
        moduleName,
        allowedFields: filteredAllowedFields,
        requiredFields: filteredRequiredFields,
        format: "excel"
      });
      toast.success("Sample Excel file downloaded");
    } catch (error) {
      toast.error("Failed to download sample Excel");
      console.error("Sample Excel download error:", error);
    }
  };

  const initMappingFromColumns = (columns: string[]) => {
    const next: Record<string, string> = {};
    const allowedNormMap = new Map(filteredAllowedFields.map((f) => [normalizeKey(f), f]));
    columns.forEach((col) => {
      const matched = allowedNormMap.get(normalizeKey(col));
      next[col] = matched || "";
    });
    setMapping(next);
  };

  const parseFirstLine = async (selectedFile: File) => {
    const head = await selectedFile.slice(0, 64 * 1024).text();
    const firstLine = head.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
    if (!firstLine) return [];
    return firstLine.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
  };

  const countCsvRows = async (selectedFile: File) => {
    const reader = selectedFile.stream().getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let rows = 0;
    let isFirstLine = true;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered += decoder.decode(value, { stream: true });
      const parts = buffered.split(/\r?\n/);
      buffered = parts.pop() || "";

      for (const line of parts) {
        if (!line.trim()) continue;
        if (isFirstLine) {
          isFirstLine = false; // skip header
          continue;
        }
        rows += 1;
      }
    }

    if (buffered.trim()) {
      if (!isFirstLine) rows += 1;
    }
    return rows;
  };

  const onPickFile = async (selected: File | null) => {
    setResult(null);
    if (!selected) return;

    const ext = fileExt(selected.name);

    if (selectedFormat === "csv" && ext !== ".csv") {
      toast.error("Please select a CSV file");
      return;
    }
    if (selectedFormat === "excel" && ext !== ".xlsx" && ext !== ".xls") {
      toast.error("Please select an EXCEL file");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File too large. Max allowed is 25MB");
      return;
    }

    setFile(selected);

    try {
      let columns: string[] = [];
      setPreviewRows([]);

      console.log("---- FILE UPLOAD DEBUG ----");
      console.log("File Name:", selected.name);
      console.log("File Size:", selected.size);
      console.log("File Type:", selected.type);
      console.log("Selected Format UI:", selectedFormat);
      console.log("Extension matched:", ext);

      if (ext === ".csv") {
        console.log("Processing as CSV...");
        const totalRows = await countCsvRows(selected);
        console.log("CSV Total Rows:", totalRows);
        setPreviewTotalRows(totalRows);
        columns = await parseFirstLine(selected);
        console.log("CSV Columns Found:", columns);

        let count = 0;
        let pRows: any[] = [];
        const reader = selected.stream().getReader();
        const decoder = new TextDecoder();
        let buffered = "";
        let isFirst = true;

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffered += decoder.decode(value, { stream: true });
          const parts = buffered.split(/\r?\n/);
          buffered = parts.pop() || "";

          for (const line of parts) {
            if (!line.trim()) continue;
            if (isFirst) {
              isFirst = false;
              continue;
            }
            // Limit preview to 500 rows for performance
            if (count < 500) {
              const rowData = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
              const obj: any = { __id: count };
              columns.forEach((col, idx) => {
                obj[col] = rowData[idx] || "";
              });
              pRows.push(obj);
              count++;
            } else {
              break outer;
            }
          }
        }
        setPreviewRows(pRows);
        setCurrentPage(1);
      } else if (ext === ".xlsx" || ext === ".xls") {
        console.log("Routing into EXCEL parser...");
        const rows = await parseExcelRows(selected);
        console.log("Parsed Excel Rows Length:", rows?.length);
        setPreviewTotalRows(rows.length);

        columns = await parseExcelHeaders(selected);
        console.log("Parsed Excel Columns:", columns);
        // Load up to 500 rows for Excel preview
        const rowsWithId = (rows || []).slice(0, 500).map((r: any, i: number) => ({ ...r, __id: i }));
        setPreviewRows(rowsWithId);
        setCurrentPage(1);
      }

      setCsvColumns(columns);
      initMappingFromColumns(columns);
    } catch (error: any) {
      console.error("ON PICK FILE ERROR:", error);
      toast.error(error.message || "Failed to parse file");
      setPreviewTotalRows(0);
      setPreviewRows([]);
      setCsvColumns([
        `ERROR: ${error?.message}`.substring(0, 100),
        `STACK: ${String(error?.stack)}`.substring(0, 100)
      ]);
      setMapping({});
      // setFile(null); // DO NOT NULL FILE so we can see error in the mapping table
    }
  };

  const onImport = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }
    if (missingRequiredFields.length > 0) {
      toast.error(`Missing required mapping: ${missingRequiredFields.join(", ")}`);
      return;
    }
    if (duplicateMappedFields > 0) {
      toast.error("One or more target fields are mapped multiple times");
      return;
    }

    try {
      const ext = fileExt(file.name);
      let allRows: any[] = [];

      if (ext === ".csv") {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
        allRows = lines.slice(1).map((line, idx) => {
          const rowData = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());
          const obj: any = { __id: idx };
          headers.forEach((h, i) => {
            obj[h] = rowData[i] || "";
          });
          return obj;
        });
      } else {
        allRows = await parseExcelRows(file);
        allRows = allRows.map((r, i) => ({ ...r, __id: i }));
      }

      const finalMappedData = allRows
        .filter(row => !excludedIndices.has(row.__id))
        .map(row => {
           const mapped: any = {};
           Object.entries(mapping).forEach(([csvCol, allowedCol]) => {
             if (allowedCol) {
               mapped[allowedCol] = row[csvCol];
             }
           });
           return mapped;
        });

      if (finalMappedData.length === 0) {
        toast.error("No valid rows to import");
        return;
      }

      const payload = {
        organizationId: selectedOrgId,
        data: finalMappedData
      };

      const token = getSecureItem("token");
      const res = await fetch(`http://localhost:5000/api${importUrl}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : ""
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Import failed: ${res.status}`);
      }

      const response = await res.json();
      const data = response?.data || null;

      if (data) {
        setResult(data);
      }

      const successCount = data?.successCount || 0;
      const totalRows = data?.totalRows || 0;

      if (data?.failedCount > 0) {
        toast.error("Import completed with some errors.");
        onCompleted?.();
        return;
      }

      if (totalRows >= 0) {
        if (successCount > 0) {
          toast.success(response?.message || "Import completed successfully");
        } else {
          toast.warning("No data was imported.");
        }
        onCompleted?.();
        setTimeout(() => closeAll(), 1);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  };

  const onExport = async () => {
    try {
      const finalFilters: any = exportScope === "all" ? {} : { ...filters };
      finalFilters.organizationId = selectedOrgId;

      if (exportScope === "date") {
        if (exportFromDate) finalFilters.from = exportFromDate;
        if (exportToDate) finalFilters.to = exportToDate;
      }

      if (exportFormat === "csv") {
        // Use existing CSV export logic
        await runExport({
          exportFile,
          exportUrl,
          moduleName,
          filters: finalFilters,
        });
      } else {
        // For Excel export, use existing exportFile to get CSV data, then convert to Excel
        const query = new URLSearchParams();
        Object.entries(finalFilters).forEach(([key, value]) => {
          if (value === undefined || value === null || value === "") return;
          query.set(key, String(value));
        });

        const token = getSecureItem("token");
        const url = `http://localhost:5000/api${exportUrl}${query.toString() ? `?${query.toString()}` : ""}`;
        const res = await fetch(url, {
          method: "GET",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          throw new Error(`Export failed: ${res.status}`);
        }

        // Get CSV data from response
        const csvText = await res.text();

        // Parse CSV to get data for Excel export
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error("No data available for export");
        }

        const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

        // Generate Excel export
        await generateExcelExport({
          data: data,
          allowedFields,
          fileName: `${moduleName}-export.xlsx`,
          sheetName: moduleName
        });
      }

      toast.success(`${exportFormat.toUpperCase()} export completed`);
      closeAll();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Export failed";
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
              {moduleName} Import / Export
            </h3>
            <p className="text-xs text-slate-500">Upload data or export with current filters.</p>
          </div>
          <button
            onClick={closeAll}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
            disabled={loading}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 pt-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            <button
              className={`rounded-lg px-3 py-1 ${tab === "import" ? "bg-white text-slate-900" : "text-slate-500"}`}
              onClick={() => setTab("import")}
            >
              Import
            </button>
            <button
              className={`rounded-lg px-3 py-1 ${tab === "export" ? "bg-white text-slate-900" : "text-slate-500"}`}
              onClick={() => setTab("export")}
            >
              Export
            </button>
          </div>
        </div>

        <div className="relative max-h-[70vh] overflow-auto p-4 space-y-4">
          {tab === "import" && (
            <>
              {/* Organization Selection Dropdown */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Organization Selection
                </label>
                {isSuperAdmin || isRootOrgAdmin ? (
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer"
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                    >
                      <option value="">Select Organization</option>
                      <optgroup label="Main Organizations">
                        {orgData?.data?.filter((o: any) => !o.parentOrganizationId).map((o: any) => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Sub Organizations">
                        {orgData?.data?.filter((o: any) => o.parentOrganizationId).map((o: any) => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </optgroup>
                    </select>
                    <Building2 className="absolute right-4 top-3.5 text-slate-400" size={16} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700">
                    <Building2 size={16} className="text-slate-400" />
                    <span>{orgName}</span>
                  </div>
                )}
                {selectedOrgId && (
                  <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase tracking-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    Data will be imported into: {
                      (isSuperAdmin || isRootOrgAdmin)
                        ? orgData?.data?.find((o: any) => o._id === selectedOrgId)?.name || "Selected Organization"
                        : orgName
                    }
                  </p>
                )}
              </div>

              {/* Format Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Select File Format
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-500">
                    <input
                      type="radio"
                      name="importFormat"
                      value="csv"
                      checked={selectedFormat === "csv"}
                      onChange={() => {
                        setSelectedFormat("csv");
                        setFile(null);
                        setPreviewTotalRows(0);
                        setPreviewRows([]);
                        setCsvColumns([]);
                        setMapping({});
                        setResult(null);
                      }}
                      className="mr-2"
                    />
                    <FileText size={16} />
                    <span className="text-sm">CSV</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer text-slate-500">
                    <input
                      type="radio"
                      name="importFormat"
                      value="excel"
                      checked={selectedFormat === "excel"}
                      onChange={() => {
                        setSelectedFormat("excel");
                        setFile(null);
                        setPreviewTotalRows(0);
                        setPreviewRows([]);
                        setCsvColumns([]);
                        setMapping({});
                        setResult(null);
                      }}
                      className="mr-2"
                    />
                    <FileSpreadsheet size={16} />
                    <span className="text-sm">Excel (.xlsx)</span>
                  </label>
                </div>
              </div>

              {/* Sample Download Buttons */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Download Sample Files
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={downloadSampleCSV}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-500"
                  >
                    <FileText size={14} />
                    Download Sample CSV
                  </button>
                  <button
                    onClick={downloadSampleExcel}
                    disabled={loading}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 text-slate-500"
                  >
                    <FileSpreadsheet size={14} />
                    Download Sample Excel
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Upload {selectedFormat.toUpperCase()}
                </label>
                <FilePond
                  key={selectedFormat}
                  files={file ? [file] : []}
                  onupdatefiles={(fileItems) => {
                    console.log("FilePond onupdatefiles:", fileItems.length, "items");
                    const next = (fileItems[0]?.file as File) || null;
                    if (next) {
                      console.log("New file selected in FilePond:", next.name);
                    } else {
                      console.log("File removed from FilePond");
                    }
                    void onPickFile(next);
                  }}
                  allowMultiple={false}
                  maxFiles={1}
                  acceptedFileTypes={selectedFormat === "csv"
                    ? [".csv", "text/csv", "application/csv", "text/x-csv", "application/x-csv", "text/comma-separated-values", "text/x-comma-separated-values", "application/vnd.ms-excel"]
                    : [".xlsx", ".xls", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"]
                  }
                  labelIdle={`Drag & Drop your ${selectedFormat.toUpperCase()} file or <span class="filepond--label-action">Browse</span>`}
                  disabled={loading}
                  credits={false}
                />
                {file && (
                  <p className="mt-2 text-xs text-slate-600">
                    Selected: <span className="font-semibold">{file.name}</span>
                  </p>
                )}
              </div>

              {csvColumns.length > 0 && (
                <MappingTable
                  csvColumns={csvColumns}
                  allowedFields={filteredAllowedFields}
                  requiredFields={filteredRequiredFields}
                  mapping={mapping}
                  onChange={(col, value) =>
                    setMapping((prev) => ({ ...prev, [col]: value }))
                  }
                />
              )}

              {previewRows.length > 0 && csvColumns.length > 0 && (
                <div className="rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden mb-4">
                  <div className="bg-slate-100 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                        File Preview (Showing {previewRows.length} rows)
                      </h4>
                      <label className="flex items-center gap-1.5 cursor-pointer bg-white px-2 py-1 rounded border border-slate-300 text-[9px] font-black text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                        <input
                          type="checkbox"
                          checked={showPreview}
                          onChange={(e) => setShowPreview(e.target.checked)}
                          className="w-3.5 h-3.5 accent-blue-600 rounded"
                        />
                        <span>SHOW PREVIEW</span>
                      </label>
                    </div>
                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg p-0.5 shadow-sm mr-auto ml-4">
                      <button
                        onClick={() => scrollTable("left")}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors border-r border-slate-100"
                        title="Scroll Left"
                      >
                        <ChevronLeft size={14} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => scrollTable("right")}
                        className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                        title="Scroll Right"
                      >
                        <ChevronRight size={14} strokeWidth={3} />
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search rows..."
                        className="text-[11px] px-3 py-1.5 rounded-lg border border-slate-400 bg-white text-slate-900 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-slate-900/10 min-w-[200px]"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tight shadow-sm ${excludedIndices.size > 0 ? "bg-rose-600 text-white" : "bg-slate-800 text-white"
                        }`}>
                        {excludedIndices.size} Excluded
                      </span>
                    </div>
                  </div>
                  {showPreview && (
                    <>
                      <div
                        ref={scrollRef}
                        className="max-h-[350px] overflow-auto scrollbar-thin scrollbar-thumb-slate-400 scrollbar-track-transparent"
                      >
                        <table className="w-full text-left text-xs whitespace-nowrap min-w-full table-auto border-collapse">
                          <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 z-20 shadow-sm">
                            <tr>
                              <th className="px-4 py-3 bg-slate-100 border-r border-slate-200 w-12 sticky left-0 z-30 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                <span className="sr-only">Exclude</span>
                              </th>
                              {csvColumns.map((col) => (
                                <th key={col} className="px-4 py-2 font-black text-slate-900 bg-slate-100 border-r border-slate-200 last:border-r-0">
                                  {col}{" "}
                                  {mapping[col] && (
                                    <span className="inline-block ml-1 text-[9px] font-black uppercase tracking-widest text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded-md border border-blue-200">
                                      {mapping[col]}
                                    </span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {paginatedRows.map((row) => {
                              const isExcluded = excludedIndices.has(row.__id);
                              return (
                                <tr
                                  key={row.__id}
                                  className={`hover:bg-slate-50 transition-colors ${isExcluded ? "bg-slate-100 text-slate-400 opacity-60 italic" : "text-slate-700 font-medium"
                                    }`}
                                >
                                  <td className="px-4 py-3 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] text-center">
                                    <input
                                      type="checkbox"
                                      checked={isExcluded}
                                      onChange={() => toggleExclude(row.__id)}
                                      title="Mark to exclude from import"
                                      className="accent-rose-600 cursor-pointer w-4 h-4 rounded border-slate-300"
                                    />
                                  </td>
                                  {csvColumns.map((col) => {
                                    const value = row[col];
                                    return (
                                      <td key={col} className={`px-4 py-3 border-r border-slate-100 last:border-r-0 ${isExcluded ? "line-through decoration-rose-500 decoration-2" : ""}`}>
                                        {value !== undefined && value !== null ? String(value) : (
                                          <span className="text-slate-300 italic">empty</span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                            {paginatedRows.length === 0 && (
                              <tr>
                                <td colSpan={csvColumns.length + 1} className="px-4 py-12 text-center text-slate-500 font-bold bg-slate-50">
                                  No rows matching "{searchQuery}"
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      {filteredPreviewRows.length > rowsPerPage && (
                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-[11px] font-bold">
                          <div className="text-slate-600">
                            Showing <span className="text-slate-900">{(currentPage - 1) * rowsPerPage + 1}</span> to <span className="text-slate-900">{Math.min(currentPage * rowsPerPage, filteredPreviewRows.length)}</span> of <span className="text-slate-900">{filteredPreviewRows.length}</span> results
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700"
                            >
                              Previous
                            </button>
                            <div className="flex items-center gap-1 px-2 text-slate-900">
                              {(() => {
                                const pages = [];
                                const maxVisible = 5;
                                let start = Math.max(1, currentPage - 2);
                                let end = Math.min(totalPages, start + maxVisible - 1);

                                if (end - start + 1 < maxVisible) {
                                  start = Math.max(1, end - maxVisible + 1);
                                }

                                for (let i = start; i <= end; i++) {
                                  pages.push(
                                    <button
                                      key={i}
                                      onClick={() => setCurrentPage(i)}
                                      className={`w-8 h-8 rounded-lg border ${currentPage === i
                                        ? "bg-slate-900 text-white border-slate-900"
                                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                        }`}
                                    >
                                      {i}
                                    </button>
                                  );
                                }
                                return pages;
                              })()}
                              {totalPages > (currentPage + 2) && totalPages > 5 && (
                                <>
                                  <span className="px-1 text-slate-400">...</span>
                                  <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    className="w-8 h-8 rounded-lg border bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                                  >
                                    {totalPages}
                                  </button>
                                </>
                              )}
                            </div>
                            <button
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700"
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              <ValidationSummary
                totalRows={result?.totalRows ?? previewTotalRows}
                validRows={result ? result.successCount : 0}
                invalidRows={result ? result.failedCount : 0}
                duplicateCount={duplicateMappedFields}
                missingRequiredFields={missingRequiredFields}
              />

              {result && result.errors.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                  <div className="mb-1 text-[10px] font-black uppercase tracking-widest text-rose-600">
                    Invalid Rows Preview
                  </div>
                  <div className="max-h-36 space-y-1 overflow-auto text-xs">
                    {result.errors.slice(0, 25).map((err, idx) => (
                      <div key={`${err.rowNumber}-${idx}`} className="text-rose-700">
                        Row {err.rowNumber}: {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {loading && (
                <div className="rounded-xl bg-slate-100 p-3 text-xs">
                  <div className="mb-1 flex items-center gap-2 text-slate-700">
                    <Loader2 size={14} className="animate-spin" /> Uploading...
                  </div>
                  <div className="h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-blue-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                    {progress >= 100 ? "Upload complete. Processing rows..." : `Uploading... ${progress}%`}
                  </div>
                </div>
              )}
              {error && <div className="text-xs text-rose-600">{error}</div>}
            </>
          )}

          {tab === "export" && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                Export will include currently applied filters from this table view. Choose below if you want all data or a specific date range.
              </div>

              {/* Organization Selection Dropdown (Export Tab) */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Organization Context
                </label>
                {isSuperAdmin || isRootOrgAdmin ? (
                  <div className="relative">
                    <select
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500/20 outline-none appearance-none cursor-pointer"
                      value={selectedOrgId}
                      onChange={(e) => setSelectedOrgId(e.target.value)}
                    >
                      <option value="">Select Organization</option>
                      <optgroup label="Main Organizations">
                        {orgData?.data?.filter((o: any) => !o.parentOrganizationId).map((o: any) => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Sub Organizations">
                        {orgData?.data?.filter((o: any) => o.parentOrganizationId).map((o: any) => (
                          <option key={o._id} value={o._id}>{o.name}</option>
                        ))}
                      </optgroup>
                    </select>
                    <Building2 className="absolute right-4 top-3.5 text-slate-400" size={16} />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700">
                    <Building2 size={16} className="text-slate-400" />
                    <span>{orgName}</span>
                  </div>
                )}
                {selectedOrgId && (
                  <p className="mt-2 text-[10px] text-blue-600 font-bold uppercase tracking-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                    Data will be exported from: {
                      (isSuperAdmin || isRootOrgAdmin)
                        ? orgData?.data?.find((o: any) => o._id === selectedOrgId)?.name || "Selected Organization"
                        : orgName
                    }
                  </p>
                )}
              </div>

              {/* Data Range Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Select Data Range
                </label>
                <div className="flex gap-4 text-slate-500">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportScope"
                      value="all"
                      checked={exportScope === "all"}
                      onChange={() => setExportScope("all")}
                      className="mr-2"
                    />
                    <FileText size={16} />
                    <span className="text-sm">Export All</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer ">
                    <input
                      type="radio"
                      name="exportScope"
                      value="date"
                      checked={exportScope === "date"}
                      onChange={() => setExportScope("date")}
                      className="mr-2"
                    />
                    <FileSpreadsheet size={16} />
                    <span className="text-sm">Custom Date Range</span>
                  </label>
                </div>
              </div>

              {/* Export Format Selector */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Export Format
                </label>
                <div className="flex gap-4 text-slate-500">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === "csv"}
                      onChange={(e) => setExportFormat(e.target.value as "csv" | "excel")}
                      className="mr-2"
                    />
                    <FileText size={16} />
                    <span className="text-sm">Download CSV</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer ">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="excel"
                      checked={exportFormat === "excel"}
                      onChange={(e) => setExportFormat(e.target.value as "csv" | "excel")}
                      className="mr-2"
                    />
                    <FileSpreadsheet size={16} />
                    <span className="text-sm">Download Excel</span>
                  </label>
                </div>
              </div>

              {exportScope === "date" && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      Start Date (From)
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={exportFromDate}
                      onChange={(e) => setExportFromDate(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                      End Date (To)
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                      value={exportToDate}
                      onChange={(e) => setExportToDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            type="button"
            onClick={closeAll}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
            disabled={loading}
          >
            Cancel
          </button>
          {tab === "import" ? (
            <button
              type="button"
              onClick={() => void onImport()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading || !file}
            >
              <Upload size={14} />
              Import Data
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onExport()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:opacity-50"
              disabled={loading || !isExportValid}
            >
              <Download size={14} />
              Export Data
            </button>
          )}
        </div>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 shadow-lg">
              <Loader2 size={16} className="animate-spin" />
              Processing... Please wait
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
