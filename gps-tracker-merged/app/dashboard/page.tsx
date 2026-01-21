"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { StatusCards, VehicleStatusFilter } from "@/components/dashboard/status-cards"
import { ActionToolbar } from "@/components/dashboard/action-toolbar"
import { VehicleSidebar } from "@/components/dashboard/vehicle-sidebar"
import { MapWrapper } from "@/components/dashboard/map-wrapper"
import { ActivityStats } from "@/components/dashboard/activity-stats"
import { VehicleDetails } from "@/components/dashboard/vehicle-details"
import { useVehiclePositions } from "@/lib/use-vehicle-positions"

export default function DashboardPage() {
  const router = useRouter()
  const positions = useVehiclePositions()
  const [isAuthed, setIsAuthed] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<VehicleStatusFilter>("total")

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userRole = localStorage.getItem("userRole")

    if (!token) {
      router.replace("/")
      return
    }

    // Allow manager, admin, and superadmin to access dashboard
    if (userRole && ["manager", "admin", "superadmin"].includes(userRole)) {
      setIsAuthed(true)
    } else {
      router.replace("/")
    }
  }, [router])

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Checking session...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      <Header />

      <div className="shrink-0 border-b border-white/10 bg-slate-950/80">
        <StatusCards
          activeFilter={statusFilter}
          onFilterChange={(filter) => {
            setStatusFilter(filter)
            setSelectedVehicle(null)
          }}
        />
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div
            className={`h-full min-h-0 shrink-0 transition-all duration-300 ease-in-out ${
              selectedVehicle ? "lg:w-1/2 w-full" : "lg:w-3/5 w-full"
            }`}
          >
            <VehicleSidebar
              selectedId={selectedVehicle}
              onSelect={(id) => setSelectedVehicle(id === selectedVehicle ? null : id)}
              isFullWidth={false}
              statusFilter={statusFilter}
            />
          </div>

          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden border-l border-white/10 bg-slate-950 lg:w-2/5 w-full">
            <div className="flex h-full w-full flex-col">
              <ActionToolbar compact className="border-b border-white/10" />
              <div className="flex-1 min-h-0 overflow-hidden">
                <MapWrapper selectedVehicleId={selectedVehicle} positions={positions} />
              </div>
            </div>
          </div>
        </div>

        {selectedVehicle && (
          <div className="h-105 shrink-0 overflow-hidden border-t border-white/10 bg-slate-950 p-2 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.4)]">
            <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
              <div className="h-65 shrink-0 overflow-hidden">
                <ActivityStats />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <VehicleDetails vehicleId={selectedVehicle} positions={positions} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
