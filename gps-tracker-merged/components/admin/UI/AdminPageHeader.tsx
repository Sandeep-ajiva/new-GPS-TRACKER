"use client";

import type { ReactNode } from "react";
import clsx from "clsx";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export default function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={clsx(
        "flex flex-col gap-4 rounded-[24px] border border-slate-200/80 bg-gradient-to-br from-white via-slate-50 to-blue-50/70 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] sm:flex-row sm:items-start sm:justify-between",
        className,
      )}
    >
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-black uppercase tracking-[0.34em] text-slate-400">
            {eyebrow}
          </p>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-[30px]">
            {title}
          </h1>
          {description ? (
            <div className="max-w-3xl text-sm font-medium leading-6 text-slate-600">
              {description}
            </div>
          ) : null}
        </div>
      </div>

      {actions ? (
        <div className="flex flex-wrap items-center gap-3 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  );
}
