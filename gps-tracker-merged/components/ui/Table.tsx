"use client";

import { ReactNode } from "react";

interface TableProps {
  columns: {
    header: string;
    accessor: string | ((row: any) => ReactNode);
  }[];
  data: any[];
  loading?: boolean;
}

export default function Table({ columns, data, loading }: TableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-16 text-center">
        <p className="text-gray-400 font-medium">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-widest"
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
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className="px-6 py-4 text-sm font-medium text-gray-900"
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
