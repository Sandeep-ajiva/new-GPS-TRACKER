"use client";

import { useCallback, useMemo, useState } from "react";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";

type ImportExportState = {
  loading: boolean;
  progress: number;
  error: string | null;
  success: string | null;
};

type ImportResult = {
  status: boolean;
  message: string;
  data?: {
    totalRows: number;
    successCount: number;
    failedCount: number;
    errors: { rowNumber: number; message: string }[];
  };
};

const API_BASE = "http://localhost:5000/api";

export function useImportExport() {
  const [state, setState] = useState<ImportExportState>({
    loading: false,
    progress: 0,
    error: null,
    success: null,
  });

  const token = useMemo(() => {
    const value = getSecureItem("token");
    return typeof value === "string" ? value : "";
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      progress: 0,
      error: null,
      success: null,
    });
  }, []);

  const uploadFile = useCallback(
    async ({
      importUrl,
      file,
      onProgress,
    }: {
      importUrl: string;
      file: File;
      onProgress?: (progress: number) => void;
    }): Promise<ImportResult> => {
      setState({ loading: true, progress: 0, error: null, success: null });

      const formData = new FormData();
      formData.append("file", file);

      const result = await new Promise<ImportResult>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API_BASE}${importUrl}`);
        if (token) {
          xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        }

        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return;
          const p = Math.round((evt.loaded / evt.total) * 100);
          setState((prev) => ({ ...prev, progress: p }));
          onProgress?.(p);
        };

        xhr.onload = () => {
          let parsed: ImportResult | { message?: string } = {
            status: false,
            message: "Unknown response",
          };
          try {
            parsed = JSON.parse(xhr.responseText || "{}");
          } catch {
            // no-op
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(parsed as ImportResult);
            return;
          }

          const message = (parsed as { message?: string })?.message || `Request failed: ${xhr.status}`;
          setState({ loading: false, progress: 0, error: message, success: null });
          reject(new Error(message));
        };

        xhr.onerror = () => {
          const message = "Network error while uploading file";
          setState({ loading: false, progress: 0, error: message, success: null });
          reject(new Error(message));
        };
        xhr.send(formData);
      });

      setState({
        loading: false,
        progress: 100,
        error: null,
        success: result.message || "Import completed",
      });
      return result;
    },
    [token],
  );

  const exportFile = useCallback(
    async ({
      exportUrl,
      fileName,
      filters,
    }: {
      exportUrl: string;
      fileName?: string;
      filters?: Record<string, string | number | boolean | null | undefined>;
    }) => {
      setState({ loading: true, progress: 0, error: null, success: null });

      const query = new URLSearchParams();
      Object.entries(filters || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        query.set(key, String(value));
      });

      const url = `${API_BASE}${exportUrl}${query.toString() ? `?${query.toString()}` : ""}`;
      const res = await fetch(url, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        let message = `Export failed: ${res.status}`;
        try {
          const json = await res.json();
          message = json?.message || message;
        } catch {
          // no-op
        }
        setState({ loading: false, progress: 0, error: message, success: null });
        throw new Error(message);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition") || "";
      const matchedName = contentDisposition.match(/filename="?([^"]+)"?/i)?.[1];
      const downloadName = fileName || matchedName || "export.csv";

      const link = document.createElement("a");
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
      link.download = downloadName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);

      setState({
        loading: false,
        progress: 100,
        error: null,
        success: "Export completed",
      });
    },
    [token],
  );

  return {
    ...state,
    uploadFile,
    exportFile,
    reset,
  };
}

