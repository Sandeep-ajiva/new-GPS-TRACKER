"use client";
import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Search } from "lucide-react";

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([
    { id: "note_1", title: "New org onboarded", body: "North Branch added 3 vehicles.", time: "2m ago", read: false },
    { id: "note_2", title: "GPS device offline", body: "IMEI 86543210002 lost signal.", time: "18m ago", read: false },
    { id: "note_3", title: "Payment received", body: "Ajiva Tracker paid invoice #INV-2201.", time: "1h ago", read: true },
  ]);

  const shortcuts = useMemo(
    () => [
      { label: "Organizations", href: "/superadmin/organizations" },
      { label: "Vehicles", href: "/superadmin/vehicles" },
      { label: "GPS Devices", href: "/superadmin/gps-devices" },
      { label: "Users", href: "/superadmin/users" },
      { label: "Device Mapping", href: "/superadmin/device-mapping" },
      { label: "Live Tracking", href: "/superadmin/live-tracking" },
      { label: "History Playback", href: "/superadmin/history" },
      { label: "Services", href: "/superadmin/services" },
      { label: "Billing & Payments", href: "/superadmin/billing" },
      { label: "Depots", href: "/superadmin/depots" },
      { label: "Settings", href: "/superadmin/settings" },
      { label: "Permissions", href: "/superadmin/permissions" },
    ],
    []
  );

  const searchCatalog = useMemo(() => {
    const orgs = [
      {
        id: "org_ajiva",
        name: "Ajiva Tracker",
        adminId: "adm_901",
        adminName: "Diana Kapoor",
        href: "/superadmin/organizations/org_ajiva",
      },
      {
        id: "org_north",
        name: "North Branch",
        adminId: "adm_902",
        adminName: "Rohan Singh",
        href: "/superadmin/organizations/org_north",
      },
      {
        id: "org_west",
        name: "West Branch",
        adminId: "adm_903",
        adminName: "Aanya Mehta",
        href: "/superadmin/organizations/org_west",
      },
    ];

    const vehicles = [
      {
        id: "veh_1",
        vehicleNumber: "DL 10CK1840",
        driverId: "drv_101",
        orgId: "org_ajiva",
        href: "/superadmin/vehicles/veh_1",
      },
      {
        id: "veh_2",
        vehicleNumber: "DL 10CK1844",
        driverId: "drv_102",
        orgId: "org_ajiva",
        href: "/superadmin/vehicles/veh_2",
      },
      {
        id: "veh_3",
        vehicleNumber: "PB 10AX2234",
        driverId: "drv_201",
        orgId: "org_north",
        href: "/superadmin/vehicles/veh_3",
      },
    ];

    const users = [
      {
        id: "user_1",
        name: "Admin User",
        email: "admin@ajiva.com",
        role: "admin",
        href: "/superadmin/users",
      },
      {
        id: "user_2",
        name: "Super Admin",
        email: "superadmin@ajiva.com",
        role: "superadmin",
        href: "/superadmin/users",
      },
    ];

    const orgItems = orgs.map((org) => ({
      id: org.id,
      label: org.name,
      meta: `Org ID ${org.id} · Admin ${org.adminName}`,
      href: org.href,
      keywords: [org.id, org.name, org.adminId, org.adminName],
    }));

    const vehicleItems = vehicles.map((vehicle) => ({
      id: vehicle.id,
      label: vehicle.vehicleNumber,
      meta: `Vehicle ID ${vehicle.id} · Driver ${vehicle.driverId}`,
      href: vehicle.href,
      keywords: [vehicle.id, vehicle.vehicleNumber, vehicle.driverId, vehicle.orgId],
    }));

    const userItems = users.map((user) => ({
      id: user.id,
      label: user.name,
      meta: `User ID ${user.id} · ${user.role}`,
      href: user.href,
      keywords: [user.id, user.name, user.email, user.role],
    }));

    const shortcutItems = shortcuts.map((item) => ({
      id: item.href,
      label: item.label,
      meta: "Section",
      href: item.href,
      keywords: [item.label, item.href],
    }));

    return [...orgItems, ...vehicleItems, ...userItems, ...shortcutItems];
  }, [shortcuts]);

  const results = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return searchCatalog;
    return searchCatalog.filter((item) =>
      item.keywords.some((keyword) => keyword.toLowerCase().includes(trimmed))
    );
  }, [query, searchCatalog]);

  const unreadCount = notifications.filter((note) => !note.read).length;

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 fixed top-0 right-0 left-64 z-40 px-6 flex items-center justify-between text-white">
      <div className="w-[420px] relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
        <input
          type="text"
          placeholder="Search control plane..."
          className="w-full pl-10 pr-4 py-2 border border-slate-800 bg-slate-950 rounded-xl text-sm font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 placeholder-slate-500 transition"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setShowSearch(true);
          }}
          onFocus={() => setShowSearch(true)}
          onBlur={() => {
            setTimeout(() => setShowSearch(false), 120);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && results[0]) {
              router.push(results[0].href);
              setShowSearch(false);
            }
          }}
        />
        {showSearch && (
          <div className="absolute left-0 right-0 top-12 rounded-2xl border border-slate-800 bg-slate-950/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)] p-2">
            <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Quick Access
            </p>
            <div className="max-h-64 overflow-y-auto">
              {results.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    setShowSearch(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    <span className="text-[10px] uppercase tracking-widest text-slate-500">{item.meta}</span>
                  </div>
                </button>
              ))}
              {results.length === 0 && (
                <p className="px-3 py-3 text-xs font-semibold text-slate-500">No matches found.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            className="relative p-2 text-slate-300 hover:bg-slate-800 rounded-full transition"
            onClick={() => setShowNotifications((prev) => !prev)}
          >
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-black text-slate-900 border border-slate-900">
              {unreadCount}
            </span>
          )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-slate-800 bg-slate-950/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.9)]">
              <div className="px-4 py-3 border-b border-slate-800">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Notifications</p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === note.id ? { ...item, read: true } : item
                        )
                      );
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-slate-800/70 transition ${note.read ? "bg-transparent" : "bg-emerald-500/10"}`}
                  >
                    <p className="text-sm font-semibold text-slate-100">{note.title}</p>
                    <p className="text-xs text-slate-400">{note.body}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1">{note.time}</p>
                  </button>
                ))}
                {notifications.length === 0 && (
                  <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-800"></div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">Super Admin</p>
            <p className="text-xs text-slate-400">root@gps-tracker.com</p>
          </div>
          <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-slate-900 font-bold border border-emerald-400">
            SA
          </div>
        </div>
      </div>
    </header>
  );
}
