"use client";

import Link from "next/link";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Finance</p>
        <h1 className="text-2xl font-black text-slate-100">Payments</h1>
        <p className="text-sm text-slate-400">Payments are now unified under Billing.</p>
      </div>
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 text-sm text-slate-300">
        Use the combined finance view to manage invoices and settlements.
        <Link
          href="/superadmin/billing"
          className="ml-2 text-emerald-300 hover:text-emerald-200"
        >
          Go to Billing & Payments
        </Link>
      </div>
    </div>
  );
}
