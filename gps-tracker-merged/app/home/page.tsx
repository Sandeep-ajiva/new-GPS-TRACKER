"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Radar, ShieldCheck, Activity, ArrowRight } from "lucide-react";
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper";
import DashboardMap from "@/components/admin/Map/DashboardMap";

const roleToDashboard = (role?: string | null) => {
  if (role === "superadmin") return "/superadmin";
  if (role === "admin") return "/admin";
  return "/dashboard";
};

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getSecureItem("token");
    if (!token) {
      router.replace("/");
    }
  }, [router]);

  const handleDashboardClick = () => {
    const role = getSecureItem("userRole");
    router.push(roleToDashboard(role));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 left-10 h-40 w-40 rounded-full bg-blue-200/40 blur-3xl float-orb orb-1" />
      <div className="pointer-events-none absolute top-32 right-10 h-32 w-32 rounded-full bg-emerald-200/40 blur-3xl float-orb orb-2" />
      <div className="pointer-events-none absolute bottom-10 left-1/3 h-44 w-44 rounded-full bg-cyan-200/40 blur-3xl float-orb orb-3" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-36 w-36 rounded-full bg-indigo-200/40 blur-3xl float-orb orb-4" />

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-3 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white font-black">
              GT
            </div>
            <div>
              <p className="text-sm font-black tracking-widest">GPS TRACKER</p>
              <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">
                Unified Home
              </p>
            </div>
          </div>
          <button
            onClick={handleDashboardClick}
            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
          >
            Dashboard <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 2xl:max-w-[1400px] min-h-[calc(100vh-72px)]">
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.35em] text-blue-700">
              <Radar size={14} /> Live Fleet Command
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">
              Real-time visibility for every vehicle, every route, every shift.
            </h1>
            <p className="text-sm text-slate-600 sm:text-base">
              Track locations, driver activity, device health, and alerts from one
              shared home. Jump into your dashboard with a single click.
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Live Operations",
                  copy: "Watch moving vehicles with instant status changes and health checks.",
                  icon: Activity,
                  delay: "0s",
                },
                {
                  title: "Secure Monitoring",
                  copy: "Role-based access with continuous alerts and auditing.",
                  icon: ShieldCheck,
                  delay: "0.1s",
                },
                {
                  title: "Geo Intelligence",
                  copy: "High-precision map overlays and routing snapshots.",
                  icon: MapPin,
                  delay: "0.2s",
                },
                {
                  title: "Device Insights",
                  copy: "Track SIM, firmware, and connectivity at a glance.",
                  icon: Radar,
                  delay: "0.3s",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm pulse-border fade-up"
                  style={{ animationDelay: item.delay }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                      <item.icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.copy}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: "Active Fleets", value: "128+" },
                { label: "Live Alerts", value: "2.4k" },
                { label: "Devices Online", value: "98%" },
                { label: "Routes Covered", value: "45K km" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 text-center pulse-border fade-up"
                >
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg pulse-border">
            <div className="relative h-[420px] sm:h-[480px]">
              <div className="absolute inset-0">
                <DashboardMap />
              </div>
              <div className="absolute left-6 top-6 rounded-2xl border border-slate-200 bg-white/90 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                Live Map View
              </div>
              <div className="absolute left-10 top-44 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-md animate-[vehicle-move-1_14s_linear_infinite]">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                AJ-201 Running
              </div>
              <div className="absolute right-10 top-20 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-md animate-[vehicle-move-2_16s_linear_infinite]">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                BL-54 Idle
              </div>
              <div className="absolute left-20 bottom-20 flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-md animate-[vehicle-move-3_18s_linear_infinite]">
                <span className="h-2 w-2 rounded-full bg-red-500" />
                ND-11 Stopped
              </div>
              <div className="absolute right-8 bottom-8 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Live Snapshot
                </p>
                <p className="text-sm font-bold text-slate-900">8 vehicles active</p>
                <p className="text-xs text-slate-500">2 alerts • 1 idle zone</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm pulse-border">
          <div className="absolute inset-0 grid-pan opacity-30" />
          <div className="relative grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-slate-500">
                Industrial Control Layer
              </p>
              <h2 className="text-2xl font-black text-slate-900">
                Built for logistics, transit, and heavy-duty operations.
              </h2>
              <p className="text-sm text-slate-600">
                Centralize dispatch, compliance, and asset intelligence in one
                industrial-grade console. Designed for uptime, clarity, and instant
                operational decisions.
              </p>
              <div className="space-y-3">
                {[
                  { label: "Fleet Compliance", value: "98.7%" },
                  { label: "Incident Response", value: "4m 18s" },
                  { label: "Daily Coverage", value: "1,240 km" },
                ].map((metric) => (
                  <div key={metric.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                      <span>{metric.label}</span>
                      <span className="text-slate-900">{metric.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <span className="block h-full w-3/4 metric-bar" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                {
                  title: "Route Intelligence",
                  detail:
                    "Visualize every route with context, speed, and event overlays for smarter decisions.",
                  delay: "0s",
                },
                {
                  title: "Alert Response",
                  detail:
                    "Respond fast with prioritized incidents, smart acknowledgements, and escalations.",
                  delay: "0.1s",
                },
                {
                  title: "Operational Reporting",
                  detail:
                    "Export detailed summaries for compliance, performance, and customer reporting.",
                  delay: "0.2s",
                },
                {
                  title: "Integration Ready",
                  detail:
                    "Connect telematics, sensors, and third-party ERP with clean APIs.",
                  delay: "0.3s",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm pulse-border fade-up"
                  style={{ animationDelay: card.delay }}
                >
                  <p className="text-base font-black text-slate-900">{card.title}</p>
                  <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            {
              title: "Uptime Monitoring",
              detail:
                "Monitor device health, firmware status, and connectivity across the fleet.",
            },
            {
              title: "Driver Performance",
              detail:
                "Track driving patterns, idle time, and safety scorecards.",
            },
            {
              title: "Maintenance Window",
              detail:
                "Schedule service intervals with proactive reminders and logs.",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm pulse-border fade-up"
            >
              <p className="text-base font-black text-slate-900">{card.title}</p>
              <p className="mt-2 text-sm text-slate-600">{card.detail}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
