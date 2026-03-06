"use client";

import { useMemo, useState } from "react";
import { Loader2, Upload, Download, X } from "lucide-react";
import { toast } from "sonner";
import MappingTable from "./MappingTable";
import ValidationSummary from "./ValidationSummary";
import { runExport } from "./ExportHandler";
import { useImportExport } from "@/hooks/useImportExport";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";

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
const ALLOWED_EXT = [".csv", ".xlsx"];

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
  const [file, setFile] = useState<File | null>(null);
  const [previewTotalRows, setPreviewTotalRows] = useState(0);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: { rowNumber: number; message: string }[];
  } | null>(null);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");

  const missingRequiredFields = useMemo(() => {
    const mapped = new Set(Object.values(mapping).filter(Boolean));
    return requiredFields.filter((f) => !mapped.has(f));
  }, [mapping, requiredFields]);

  const duplicateMappedFields = useMemo(() => {
    const count = new Map<string, number>();
    Object.values(mapping)
      .filter(Boolean)
      .forEach((f) => count.set(f, (count.get(f) || 0) + 1));
    return [...count.entries()].filter(([, c]) => c > 1).length;
  }, [mapping]);

  if (!isOpen) return null;

  const closeAll = () => {
    setTab("import");
    setFile(null);
    setPreviewTotalRows(0);
    setCsvColumns([]);
    setMapping({});
    setResult(null);
    setExportFromDate("");
    setExportToDate("");
    reset();
    onClose();
  };

  const initMappingFromColumns = (columns: string[]) => {
    const next: Record<string, string> = {};
    const allowedNormMap = new Map(allowedFields.map((f) => [normalizeKey(f), f]));
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
    if (!ALLOWED_EXT.includes(ext)) {
      toast.error("Only .csv and .xlsx files are allowed");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      toast.error("File too large. Max allowed is 25MB");
      return;
    }

    setFile(selected);

    if (ext === ".csv") {
      const totalRows = await countCsvRows(selected);
      setPreviewTotalRows(totalRows);
      const cols = await parseFirstLine(selected);
      setCsvColumns(cols);
      initMappingFromColumns(cols);
    } else {
      // backend currently supports csv; keep mapping blank for xlsx
      setPreviewTotalRows(0);
      setCsvColumns([]);
      setMapping({});
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
      const response = await uploadFile({ importUrl, file });
      const data = response?.data || null;
      if (data) {
        setResult(data);
      }
      const hasErrors = !!data && data.failedCount > 0;
      if (hasErrors) {
        toast.error("Import completed with errors. Please review the failed rows.");
        onCompleted?.();
        return;
      }
      toast.success(response?.message || "Import completed");
      onCompleted?.();
      closeAll();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Import failed";
      toast.error(message);
    }
  };

  const onExport = async () => {
    try {
      const finalFilters = { ...filters };
      if (exportFromDate) finalFilters.from = exportFromDate;
      if (exportToDate) finalFilters.to = exportToDate;

      await runExport({
        exportFile,
        exportUrl,
        moduleName,
        filters: finalFilters,
      });
      toast.success("Export completed");
      closeAll();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Export failed";
      toast.error(message);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
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
              <div className="rounded-xl border border-dashed border-slate-300 p-4">
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Upload CSV / Excel
                </label>
                <FilePond
                  files={file ? [file] : []}
                  onupdatefiles={(fileItems) => {
                    const next = fileItems[0]?.file || null;
                    void onPickFile(next);
                  }}
                  allowMultiple={false}
                  maxFiles={1}
                  acceptedFileTypes={["text/csv", ".csv", ".xlsx"]}
                  labelIdle='Drag & Drop your file or <span class="filepond--label-action">Browse</span>'
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
                  allowedFields={allowedFields}
                  mapping={mapping}
                  onChange={(col, value) =>
                    setMapping((prev) => ({ ...prev, [col]: value }))
                  }
                />
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
                Export will include currently applied filters from this table view. If you wish to export data for a specific date range, please select the dates below.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                    Start Date (From)
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-200 p-2 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/10"
                    value={exportFromDate}
                    onChange={(e) => setExportFromDate(e.target.value)}
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
                  />
                </div>
              </div>
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
              disabled={loading}
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
