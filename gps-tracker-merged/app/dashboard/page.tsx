"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { StatusCards, VehicleStatusFilter } from "@/components/dashboard/status-cards"
import { ActionToolbar } from "@/components/dashboard/action-toolbar"
import { VehicleSidebar } from "@/components/dashboard/vehicle-sidebar"
import { MapWrapper } from "@/components/dashboard/map-wrapper"
import { ActivityStats } from "@/components/dashboard/activity-stats"
import { VehicleDetails } from "@/components/dashboard/vehicle-details"
import { useVehiclePositions } from "@/lib/use-vehicle-positions"
import { type Vehicle } from "@/lib/vehicles"
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi"
import { useGetNotificationsQuery } from "@/redux/api/notificationsApi"
import { useGetMeQuery } from "@/redux/api/usersApi"
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi"
import { useGetUsersQuery } from "@/redux/api/usersApi"

import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: vehData } = useGetVehiclesQuery(undefined)
  const { data: notifData } = useGetNotificationsQuery(undefined, {
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  })
  const { data: meData } = useGetMeQuery(undefined)
  const { data: orgData } = useGetOrganizationsQuery(undefined)
  const { data: usersData } = useGetUsersQuery(undefined, {
    skip: getSecureItem("userRole") !== "admin",
  })
  const [uiVehicles, setUiVehicles] = useState<Vehicle[]>([])
  const positions = useVehiclePositions(uiVehicles)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<VehicleStatusFilter>("total")
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")
  const user = meData?.data
  const assignedVehicleId = user?.assignedVehicleId?._id || user?.assignedVehicleId || ""
  const organizationIdParam = searchParams.get("organizationId")
  const organizations = orgData?.organizations || orgData?.data || []
  const allVehicles = vehData?.vehicles || vehData?.data || []
  const users = usersData?.users || usersData?.data || []
  const managerCount = useMemo(
    () => users.filter((item: any) => item.role === "manager").length,
    [users]
  )

  useEffect(() => {
    const token = getSecureItem("token")
    const userRole = getSecureItem("userRole")
    setUserRole(userRole)

    if (!token) {
      router.replace("/")
      return
    }

    // Allow manager, admin, and driver to access dashboard
    if (userRole && ["manager", "admin", "driver"].includes(userRole)) {
      setIsAuthed(true)
    } else {
      router.replace("/")
    }
  }, [router])

  useEffect(() => {
    if (organizationIdParam) {
      setSelectedOrgId(organizationIdParam)
    } else if (userRole === "manager" && user?.organizationId?._id) {
      setSelectedOrgId(user.organizationId._id)
    }
  }, [organizationIdParam, userRole, user?.organizationId?._id])

  useEffect(() => {
    if (!vehData?.data) return
    const basePoint = { lat: 28.62, lng: 76.93 }
    const nextVehicles = (vehData.data as any[]).map((vehicle, index) => {
      const offset = (index + 1) * 0.002
      const route = Array.from({ length: 6 }).map((_, step) => ({
        lat: basePoint.lat + offset + step * 0.0004,
        lng: basePoint.lng + offset + step * 0.0004,
      }))
      const runningStatus = String(vehicle.runningStatus || "").toLowerCase()
      const lifecycleStatus = String(vehicle.status || "").toLowerCase()
      const status =
        lifecycleStatus === "inactive"
          ? "inactive"
          : runningStatus === "running"
            ? "running"
            : runningStatus === "idle"
              ? "idle"
              : runningStatus === "stopped"
                ? "stopped"
                : runningStatus === "inactive"
                  ? "inactive"
                  : vehicle.deviceId
                    ? "stopped"
                    : "nodata"
      return {
        id: vehicle._id,
        vehicleNumber: vehicle.vehicleNumber || vehicle.registrationNumber || vehicle._id,
        organizationId: vehicle.organizationId?._id || vehicle.organizationId,
        driver: vehicle.driverName || "Unassigned",
        date: new Date(vehicle.updatedAt || Date.now()).toLocaleString("en-GB").replace(",", ""),
        speed: vehicle.currentSpeed || 0,
        status,
        ign: false,
        ac: false,
        pw: false,
        gps: Boolean(vehicle.deviceId),
        location: vehicle.location || "Unknown",
        poi: "-",
        route,
      } as Vehicle
    })
    const filteredVehicles = nextVehicles.filter((vehicle) => {
      if (userRole === "driver" && assignedVehicleId && vehicle.id !== assignedVehicleId) return false
      if (selectedOrgId !== "all" && selectedOrgId && vehicle.organizationId !== selectedOrgId) return false
      return true
    })
    setUiVehicles(filteredVehicles)
  }, [vehData, userRole, assignedVehicleId, selectedOrgId])

  if (!isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Checking session...
      </div>
    )
  }

  const handleVehicleCreated = (created: any) => {
    const basePoint = { lat: 28.62, lng: 76.93 }
    const vehicleNumber =
      created?.vehicleNumber || created?.registrationNumber || `VEH-${Date.now()}`
    const driverName = created?.driverName || "Unassigned"
    const timestamp = new Date().toLocaleString("en-GB").replace(",", "")

    setUiVehicles((prev) => {
      const offset = (prev.length + 1) * 0.001
      const route = Array.from({ length: 5 }).map((_, index) => ({
        lat: basePoint.lat + offset + index * 0.0003,
        lng: basePoint.lng + offset + index * 0.0003,
      }))
      return [
        ...prev,
        {
          id: created?._id || vehicleNumber,
          vehicleNumber,
          driver: driverName,
          date: timestamp,
          speed: 0,
          status: "stopped",
          ign: false,
          ac: false,
          pw: false,
          gps: false,
          location: "Unknown",
          poi: "-",
          route,
        },
      ]
    })
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      <Header
        onVehicleCreated={handleVehicleCreated}
        vehicleSummary={{
          label:
            uiVehicles.find((vehicle) => vehicle.id === selectedVehicle)?.vehicleNumber ||
            uiVehicles[0]?.vehicleNumber ||
            "Vehicle",
          speed:
            uiVehicles.find((vehicle) => vehicle.id === selectedVehicle)?.speed ||
            uiVehicles[0]?.speed ||
            0,
        }}
      />

      {userRole === "admin" && (
        <div className="border-b border-white/10 bg-slate-950/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100">
              Organizations: <span className="text-emerald-200">{organizations.length}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100">
              Managers: <span className="text-emerald-200">{managerCount}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100">
              Vehicles: <span className="text-emerald-200">{allVehicles.length}</span>
            </div>
            <div className="ml-auto min-w-60">
              <select
                value={selectedOrgId}
                onChange={(event) => setSelectedOrgId(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-100"
              >
                <option value="all">All organizations</option>
                {organizations.map((org: any) => (
                  <option key={org._id} value={org._id}>
                    {org.name || "Organization"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {userRole === "driver" && (
        <div className="border-b border-white/10 bg-slate-950/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200">
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-semibold">
              Driver: {user?.firstName || "Driver"} {user?.lastName || ""}
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {user?.email || "no-email"}
            </div>
            <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-emerald-200">
              Vehicle: {user?.assignedVehicleId?.vehicleNumber || uiVehicles[0]?.vehicleNumber || "Unassigned"}
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-b border-white/10 bg-slate-950/80">
        <StatusCards
          vehicles={uiVehicles}
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
            className={`h-full min-h-0 shrink-0 transition-all duration-300 ease-in-out ${selectedVehicle ? "lg:w-1/2 w-full" : "lg:w-3/5 w-full"
              }`}
          >
            <VehicleSidebar
              vehicles={uiVehicles}
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
                <MapWrapper
                  selectedVehicleId={selectedVehicle}
                  positions={positions}
                  vehicles={uiVehicles}
                />
              </div>
            </div>
          </div>
        </div>

        {selectedVehicle && (
          <div className="h-105 shrink-0 overflow-hidden border-t border-white/10 bg-slate-950 p-2 z-10 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.4)]">
            <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
              <div className="h-65 shrink-0 overflow-hidden">
                <ActivityStats vehicles={uiVehicles} alertCount={notifData?.data?.length || 0} />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <VehicleDetails vehicleId={selectedVehicle} positions={positions} vehicles={uiVehicles} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
