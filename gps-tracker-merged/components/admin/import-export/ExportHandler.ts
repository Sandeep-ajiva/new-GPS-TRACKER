"use client";

import { toast } from "sonner";

type ExportHandlerArgs = {
  exportFile: (args: {
    exportUrl: string;
    fileName?: string;
    filters?: Record<string, string | number | boolean | null | undefined>;
  }) => Promise<void>;
  exportUrl: string;
  moduleName: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
};

export async function runExport({
  exportFile,
  exportUrl,
  moduleName,
  filters,
}: ExportHandlerArgs) {
  await exportFile({
    exportUrl,
    fileName: `${moduleName}-export.csv`,
    filters,
  });
  toast.success(`${moduleName} export downloaded`);
}

