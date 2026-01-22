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
    ? "rounded-xl border border-[#1E293B] bg-[#111827] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
    : "rounded-xl border border-[#1E293B] bg-[#111827] shadow-[0_8px_24px_rgba(0,0,0,0.4)]";
  const headerClass = isDark
    ? "border-b border-[#1E293B] bg-[#020617] text-[#9CA3AF]"
    : "border-b border-[#1E293B] bg-[#020617] text-[#9CA3AF]";
  const cellTextClass = isDark ? "text-[#E5E7EB]" : "text-[#E5E7EB]";
  const hoverClass = isDark ? "hover:bg-[#020617]" : "hover:bg-[#020617]";
  const emptyClass = isDark ? "text-[#9CA3AF]" : "text-[#9CA3AF]";
  const skeletonClass = isDark ? "bg-[#020617]" : "bg-[#020617]";

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
              className={`border-b ${isDark ? "border-[#1E293B]" : "border-[#1E293B]"} ${hoverClass} transition-colors`}
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
