"use client";

import { useMemo, useState } from "react";
import Table from "@/components/ui/Table";

const services = [
  { id: "svc_1", name: "Live Tracking Suite", tier: "Enterprise", price: "₹12,000/mo", status: "active", subscribers: 18 },
  { id: "svc_2", name: "Driver Safety Pack", tier: "Standard", price: "₹4,800/mo", status: "active", subscribers: 41 },
  { id: "svc_3", name: "Maintenance Alerts", tier: "Standard", price: "₹2,100/mo", status: "paused", subscribers: 12 },
  { id: "svc_4", name: "Fuel Optimization", tier: "Premium", price: "₹6,400/mo", status: "active", subscribers: 26 },
];

const pipelines = [
  { id: "pipe_1", org: "Ajiva Tracker", plan: "Enterprise", renewal: "May 12, 2024", owner: "Diana Kapoor" },
  { id: "pipe_2", org: "North Branch", plan: "Premium", renewal: "May 19, 2024", owner: "Rohan Singh" },
  { id: "pipe_3", org: "West Branch", plan: "Standard", renewal: "May 26, 2024", owner: "Aanya Mehta" },
];

export default function ServicesPage() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const columns = [
    { header: "Service", accessor: "name" },
    { header: "Tier", accessor: "tier" },
    { header: "Price", accessor: "price" },
    { header: "Subscribers", accessor: "subscribers" },
    {
      header: "Status",
      accessor: (row: any) => (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${
          row.status === "active"
            ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-200"
            : "border-amber-500/30 bg-amber-500/20 text-amber-200"
        }`}>
          {row.status}
        </span>
      ),
    },
  ];

  const filteredServices = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    return services.filter((service) => {
      const matchesStatus = statusFilter === "all" || service.status === statusFilter;
      const matchesSearch = !trimmed || service.name.toLowerCase().includes(trimmed);
      return matchesStatus && matchesSearch;
    });
  }, [statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-400/70">Business</p>
        <h1 className="text-2xl font-black text-slate-100">Services</h1>
        <p className="text-sm text-slate-400">Manage product bundles and subscription tiers.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Active Services" value="3" sublabel="Across all orgs" />
        <MetricCard label="Monthly Recurring" value="₹82,400" sublabel="+12% this month" />
        <MetricCard label="Upcoming Renewals" value="7" sublabel="Next 30 days" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "paused"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                statusFilter === status
                  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-200"
                  : "border-slate-800/80 bg-slate-950/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full max-w-xs rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-semibold text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
        />
      </div>
      <Table columns={columns} data={filteredServices} loading={false} variant="dark" />
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Renewal Pipeline</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {pipelines.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200">
              <p className="font-black">{item.org}</p>
              <p className="text-xs text-slate-400">Plan: {item.plan}</p>
              <p className="text-xs text-slate-500">Renewal: {item.renewal}</p>
              <p className="text-xs text-slate-500">Owner: {item.owner}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sublabel }: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.8)]">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-100">{value}</p>
      <p className="text-xs text-slate-400">{sublabel}</p>
    </div>
  );
}
