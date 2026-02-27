"use client";

type MappingTableProps = {
  csvColumns: string[];
  allowedFields: string[];
  mapping: Record<string, string>;
  onChange: (csvCol: string, value: string) => void;
};

export default function MappingTable({
  csvColumns,
  allowedFields,
  mapping,
  onChange,
}: MappingTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        Column Mapping
      </div>
      <div className="max-h-56 overflow-auto p-3 space-y-2">
        {csvColumns.map((col) => (
          <div key={col} className="grid grid-cols-2 gap-2 text-xs">
            <div className="truncate rounded-lg bg-slate-100 px-2 py-2 font-semibold text-slate-700">
              {col}
            </div>
            <select
              className="rounded-lg border border-slate-200 px-2 py-2 text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
              value={mapping[col] || ""}
              onChange={(e) => onChange(col, e.target.value)}
            >
              <option value="">Ignore</option>
              {allowedFields.map((field) => (
                <option key={field} value={field}>
                  {field}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

