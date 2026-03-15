"use client";

import { useState } from "react";
import { UploadCloud } from "lucide-react";
import ImportModal from "./ImportModal";

type ImportExportButtonProps = {
  moduleName: string;
  importUrl: string;
  exportUrl: string;
  allowedFields: string[];
  requiredFields: string[];
  filters?: Record<string, string | number | boolean | null | undefined>;
  onCompleted?: () => void;
};

export default function ImportExportButton(props: ImportExportButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-[0.22em] text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
      >
        <UploadCloud size={14} />
        Import / Export
      </button>

      <ImportModal
        isOpen={open}
        onClose={() => setOpen(false)}
        moduleName={props.moduleName}
        importUrl={props.importUrl}
        exportUrl={props.exportUrl}
        allowedFields={props.allowedFields}
        requiredFields={props.requiredFields}
        filters={props.filters}
        onCompleted={props.onCompleted}
      />
    </>
  );
}
