"use client";

import { ReactNode } from "react";

type TableRow = Record<string, any>;

interface TableColumn<T extends TableRow> {
  header: string;
  accessor: string | ((row: T) => ReactNode);
  headerClassName?: string;
  cellClassName?: string;
}

interface TableProps<T extends TableRow> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  variant?: "light" | "dark";
}

export default function Table<T extends TableRow>({
  columns,
  data,
  loading,
  variant = "light",
}: TableProps<T>) {
  const isDark = variant === "dark";
  const containerClass = isDark
    ? "rounded-xl border border-[#1E293B] bg-[#111827] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
    : "rounded-xl border border-slate-200 bg-white shadow-sm";
  const headerClass = isDark
    ? "border-b border-[#1E293B] bg-[#020617] text-[#9CA3AF]"
    : "border-b border-slate-200 bg-slate-50 text-slate-500";
  const cellTextClass = isDark ? "text-[#E5E7EB]" : "text-slate-800";
  const hoverClass = isDark ? "hover:bg-[#020617]" : "hover:bg-slate-50";
  const emptyClass = isDark ? "text-[#9CA3AF]" : "text-slate-500";
  const skeletonClass = isDark ? "bg-[#020617]" : "bg-slate-100";

  if (loading) {
    return (
      <div className={`${containerClass} p-8`}>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-12 rounded-lg animate-pulse ${skeletonClass}`} />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`${containerClass} p-16 text-center`}>
        <p className={`font-medium ${emptyClass}`}>No data available</p>
      </div>
    );
  }

  return (
    <div className={`${containerClass} overflow-hidden`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max table-auto text-sm">
          <thead>
            <tr className={headerClass}>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`whitespace-nowrap px-4 py-3 sm:px-6 sm:py-4 text-left text-[10px] font-black uppercase tracking-[0.32em] ${col.headerClassName || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b ${isDark ? "border-[#1E293B]" : "border-slate-100"} ${hoverClass} transition-colors`}
              >
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    className={`px-4 py-3 align-top sm:px-6 sm:py-4 font-medium ${cellTextClass} ${col.cellClassName || ""}`}
                  >
                    {typeof col.accessor === "function"
                      ? col.accessor(row)
                      : (row[col.accessor] ?? "-") as ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
