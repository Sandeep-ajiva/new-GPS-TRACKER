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
        className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 transition-colors"
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

