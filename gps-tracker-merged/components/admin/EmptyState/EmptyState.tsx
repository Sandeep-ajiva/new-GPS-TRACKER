"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="min-h-[400px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="text-gray-400" size={48} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm mb-6">{description}</p>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}
