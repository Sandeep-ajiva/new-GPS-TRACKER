"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type AdminPageShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function AdminPageShell({
  children,
  className,
  contentClassName,
}: AdminPageShellProps) {
  return (
    <div
      className={clsx(
        "relative flex min-h-[calc(100vh-7rem)] flex-col overflow-visible rounded-[28px] border border-slate-200/80 bg-white/85 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-slate-100 via-white to-blue-50" />
      <div className={clsx("relative flex-1 space-y-6 p-4 sm:p-6 xl:p-8", contentClassName)}>
        {children}
      </div>
    </div>
  );
}
