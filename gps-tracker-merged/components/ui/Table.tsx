"use client";

import { ReactNode } from "react";

interface TableProps {
  columns: {
    header: string;
    accessor: string | ((row: any) => ReactNode);
  }[];
  data: any[];
  loading?: boolean;
  variant?: "light" | "dark";
}

export default function Table({ columns, data, loading, variant = "light" }: TableProps) {
  const isDark = variant === "dark";
  const containerClass = isDark
    ? "rounded-2xl border border-slate-800/80 bg-slate-900/60 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]"
    : "rounded-2xl border border-slate-200 bg-white shadow-sm";
  const headerClass = isDark
    ? "border-b border-slate-800 bg-slate-900/80 text-slate-400"
    : "border-b border-slate-200 bg-slate-50 text-slate-500";
  const cellTextClass = isDark ? "text-slate-100" : "text-slate-900";
  const hoverClass = isDark ? "hover:bg-slate-800/60" : "hover:bg-slate-50";
  const emptyClass = isDark ? "text-slate-400" : "text-slate-400";
  const skeletonClass = isDark ? "bg-slate-800/80" : "bg-slate-100";

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
      <table className="w-full text-sm">
        <thead>
          <tr className={headerClass}>
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-left text-[10px] font-black uppercase tracking-[0.32em]"
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
              className={`border-b ${isDark ? "border-slate-800/70" : "border-slate-100"} ${hoverClass} transition-colors`}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`px-6 py-4 font-medium ${cellTextClass}`}
                >
                  {typeof col.accessor === "function"
                    ? col.accessor(row)
                    : row[col.accessor] || "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
