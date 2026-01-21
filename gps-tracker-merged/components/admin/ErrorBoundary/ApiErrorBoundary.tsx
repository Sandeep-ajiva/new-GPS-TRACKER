"use client";

import { AlertCircle } from "lucide-react";
import React from "react";

interface ApiErrorBoundaryProps {
  children: React.ReactNode;
  hasError: boolean;
  errorMessage?: string;
}

export default function ApiErrorBoundary({
  children,
  hasError,
  errorMessage = "Unable to load data. Backend API may not be running.",
}: ApiErrorBoundaryProps) {
  if (hasError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center bg-yellow-50 rounded-xl border border-yellow-200 p-8">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-4">
            <AlertCircle className="text-yellow-600" size={48} />
          </div>
          <h3 className="text-lg font-bold text-yellow-900 mb-2">API Unavailable</h3>
          <p className="text-yellow-700 text-sm mb-4">{errorMessage}</p>
          <p className="text-yellow-600 text-xs">
            ℹ️ Make sure your Node.js backend is running on port 5000
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
