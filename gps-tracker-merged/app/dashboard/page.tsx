"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi"
import { useGetVehicleDailyStatsByDateQuery } from "@/redux/api/vehicleDailyStatsApi"

import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"
import { useSocket } from "@/hooks/useSocket"

type LiveGpsItem = {
  vehicleId?: string | { _id?: string }
  gpsDeviceId?: string | { _id?: string }
  imei?: string
  latitude?: number
  longitude?: number
  currentSpeed?: number
  speed?: number
  ignitionStatus?: boolean
  ignition?: boolean
  movementStatus?: "running" | "idle" | "stopped" | "inactive"
  updatedAt?: string
  gpsTimestamp?: string
  currentLocation?: string
  organizationId?: string | { _id?: string }
  mainPowerStatus?: boolean
  acStatus?: boolean
  internalBatteryVoltage?: number
  batteryLevel?: number
  numberOfSatellites?: number
  gsmSignalStrength?: number
}

const LIVE_STALE_TIMEOUT_MS = 60 * 1000

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: vehData } = useGetVehiclesQuery(undefined)
  const { data: liveData } = useGetLiveVehiclesQuery(undefined, {
    pollingInterval: 10000,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
  })
  const { data: notifData } = useGetNotificationsQuery(undefined, {
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  })
  const { data: meData } = useGetMeQuery(undefined)
  const { data: orgData } = useGetOrganizationsQuery(undefined)
  const { data: usersData } = useGetUsersQuery(undefined, {
    skip: getSecureItem("userRole") !== "admin",
  })
  const [liveByVehicleId, setLiveByVehicleId] = useState<Record<string, LiveGpsItem>>({})
  const [uiVehicles, setUiVehicles] = useState<Vehicle[]>([])
  const positions = useVehiclePositions(uiVehicles)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<VehicleStatusFilter>("total")
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")
  const [clockMs, setClockMs] = useState(() => Date.now())
  const user = meData?.data
  const assignedVehicleId = user?.assignedVehicleId?._id || user?.assignedVehicleId || ""
  const organizationIdParam = searchParams.get("organizationId")
  const organizations = useMemo(() => orgData?.organizations || orgData?.data || [], [orgData])
  const allVehicles = useMemo(() => vehData?.vehicles || vehData?.data || [], [vehData])
  const liveVehicles = useMemo(() => liveData?.vehicles || liveData?.data || [], [liveData])
  const users = useMemo(() => usersData?.users || usersData?.data || [], [usersData])
  const alerts = useMemo(() => notifData?.data || [], [notifData])
  const managerCount = useMemo(
    () => users.filter((item: any) => item.role === "manager").length,
    [users]
  )
  const notificationCount = useMemo(
    () => alerts.filter((item: any) => item?.acknowledged === false).length,
    [alerts],
  )

  const toVehicleId = (liveItem: LiveGpsItem) => {
    if (typeof liveItem.vehicleId === "string") return liveItem.vehicleId
    return liveItem.vehicleId?._id || null
  }
  const toGpsDeviceId = (liveItem: LiveGpsItem) => {
    if (typeof liveItem.gpsDeviceId === "string") return liveItem.gpsDeviceId
    return liveItem.gpsDeviceId?._id || null
  }
  const toOrganizationId = (liveItem: LiveGpsItem) => {
    if (typeof liveItem.organizationId === "string") return liveItem.organizationId
    return liveItem.organizationId?._id || null
  }
  const toLiveKey = (liveItem: LiveGpsItem) => {
    return toVehicleId(liveItem) || liveItem.imei || toGpsDeviceId(liveItem) || null
  }

  const handleGpsUpdate = useCallback((update: LiveGpsItem) => {
    const key = toLiveKey(update)
    if (!key) return

    setLiveByVehicleId((prev) => {
      const nextValue = {
        ...(prev[key] || {}),
        ...update,
      }
      const prevValue = prev[key]
      if (
        prevValue &&
        prevValue.updatedAt === nextValue.updatedAt &&
        prevValue.gpsTimestamp === nextValue.gpsTimestamp &&
        prevValue.latitude === nextValue.latitude &&
        prevValue.longitude === nextValue.longitude &&
        prevValue.currentSpeed === nextValue.currentSpeed &&
        prevValue.speed === nextValue.speed &&
        prevValue.movementStatus === nextValue.movementStatus &&
        prevValue.ignitionStatus === nextValue.ignitionStatus &&
        prevValue.ignition === nextValue.ignition
      ) {
        return prev
      }
      return {
        ...prev,
        [key]: nextValue,
      }
    })
  }, [])

  const { socket } = useSocket("gps_update", handleGpsUpdate)

  useEffect(() => {
    if (!socket) return

    const orgIds = new Set<string>()
    liveVehicles.forEach((item: LiveGpsItem) => {
      const orgId = toOrganizationId(item)
      if (orgId) orgIds.add(orgId)
    })

    orgIds.forEach((orgId) => socket.emit("join_organization", orgId))

    return () => {
      orgIds.forEach((orgId) => socket.emit("leave_organization", orgId))
    }
  }, [liveVehicles, socket])

  useEffect(() => {
    if (!liveVehicles.length) return

    setLiveByVehicleId((prev) => {
      const next = { ...prev }
      let changed = false
      liveVehicles.forEach((item: LiveGpsItem) => {
        const key = toLiveKey(item)
        if (!key) return

        const prevValue = prev[key]
        if (
          prevValue &&
          prevValue.updatedAt === item.updatedAt &&
          prevValue.gpsTimestamp === item.gpsTimestamp &&
          prevValue.latitude === item.latitude &&
          prevValue.longitude === item.longitude &&
          prevValue.currentSpeed === item.currentSpeed &&
          prevValue.speed === item.speed &&
          prevValue.movementStatus === item.movementStatus &&
          prevValue.ignitionStatus === item.ignitionStatus &&
          prevValue.ignition === item.ignition
        ) {
          return
        }

        next[key] = item
        changed = true
      })
      return changed ? next : prev
    })
  }, [liveVehicles])

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
    const interval = setInterval(() => {
      setClockMs(Date.now())
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (organizationIdParam) {
      setSelectedOrgId(organizationIdParam)
    } else if (userRole === "manager" && user?.organizationId?._id) {
      setSelectedOrgId(user.organizationId._id)
    }
  }, [organizationIdParam, userRole, user?.organizationId?._id])

  useEffect(() => {
    setUiVehicles((previous) => {
      const prevRouteMap = new Map(previous.map((item) => [item.id, item.route]))
      const seenIds = new Set<string>()

      const nextVehicles = (allVehicles as any[]).map((vehicle: any) => {
        const vehicleLiveKey = vehicle._id || vehicle.deviceImei || null
        const live = (vehicleLiveKey ? liveByVehicleId[vehicleLiveKey] : null) || null

        const lat = live?.latitude
        const lng = live?.longitude
        const hasLivePosition = typeof lat === "number" && typeof lng === "number"
        const hasVehiclePosition =
          typeof vehicle?.currentLocation?.latitude === "number" &&
          typeof vehicle?.currentLocation?.longitude === "number"

        const latestPoint = hasLivePosition
          ? { lat: lat as number, lng: lng as number }
          : hasVehiclePosition
            ? {
                lat: vehicle.currentLocation.latitude,
                lng: vehicle.currentLocation.longitude,
              }
            : null

        const oldRoute = prevRouteMap.get(vehicle._id) || []
        let route = oldRoute.length ? oldRoute : latestPoint ? [latestPoint] : [{ lat: 20.5937, lng: 78.9629 }]

        if (latestPoint) {
          const last = route[route.length - 1]
          const changed = !last || last.lat !== latestPoint.lat || last.lng !== latestPoint.lng
          if (changed) route = [...route, latestPoint].slice(-30)
        }

        const lastSeenSource = live?.updatedAt || live?.gpsTimestamp || vehicle.updatedAt || null
        const lastSeenMs = lastSeenSource ? new Date(lastSeenSource).getTime() : NaN
        const isStale = Number.isFinite(lastSeenMs) ? clockMs - lastSeenMs > LIVE_STALE_TIMEOUT_MS : true

        const runningStatus = String(live?.movementStatus || vehicle.runningStatus || "").toLowerCase()
        const lifecycleStatus = String(vehicle.status || "").toLowerCase()
        let status =
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

        if (isStale && status === "running") {
          status = "stopped"
        }

        const speed = isStale ? 0 : Number(live?.currentSpeed ?? live?.speed ?? vehicle.currentSpeed ?? 0)
        const ignition = Boolean(live?.ignitionStatus ?? live?.ignition ?? false)
        const power = Boolean(live?.mainPowerStatus ?? false)
        const ac = Boolean(live?.acStatus ?? false)
        const location = live?.currentLocation || vehicle?.currentLocation?.address || "Unknown"
        const dateSource = live?.updatedAt || live?.gpsTimestamp || vehicle.updatedAt
        const date = dateSource
          ? new Date(dateSource).toLocaleString("en-GB").replace(",", "")
          : "N/A"

        const row = {
          id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber || vehicle.registrationNumber || vehicle._id,
          organizationId: vehicle.organizationId?._id || vehicle.organizationId,
          driver: vehicle.driverName || "Unassigned",
          date,
          speed,
          status,
          ign: ignition,
          ac,
          pw: power,
          gps: hasLivePosition || hasVehiclePosition,
          location,
          poi: "-",
          route,
          batteryVoltage: live?.internalBatteryVoltage ?? null,
          batteryPercent: live?.batteryLevel ?? null,
          satelliteCount: live?.numberOfSatellites ?? null,
          gsmSignal: live?.gsmSignalStrength ?? null,
        } as Vehicle

        seenIds.add(row.id)
        return row
      })

      // Fallback rows from live packets when vehicle master/mapping is missing.
      Object.entries(liveByVehicleId).forEach(([key, live]) => {
        if (!live) return
        const vehicleId = toVehicleId(live)
        if (vehicleId && seenIds.has(vehicleId)) return
        if (!vehicleId && seenIds.has(key)) return

        const lat = live.latitude
        const lng = live.longitude
        const hasPoint = typeof lat === "number" && typeof lng === "number"
        if (!hasPoint) return

        const rowId = vehicleId || key
        const oldRoute = prevRouteMap.get(rowId) || []
        const latestPoint = { lat: lat as number, lng: lng as number }
        const last = oldRoute[oldRoute.length - 1]
        const changed = !last || last.lat !== latestPoint.lat || last.lng !== latestPoint.lng
        const route =
          oldRoute.length > 0
            ? changed
              ? [...oldRoute, latestPoint].slice(-30)
              : oldRoute
            : [latestPoint]

        const movement = String(live.movementStatus || "running").toLowerCase()
        const liveTs = live.updatedAt || live.gpsTimestamp || null
        const liveMs = liveTs ? new Date(liveTs).getTime() : NaN
        const isStale = Number.isFinite(liveMs) ? clockMs - liveMs > LIVE_STALE_TIMEOUT_MS : true

        let status: Vehicle["status"] =
          movement === "running" || movement === "idle" || movement === "stopped" || movement === "inactive"
            ? movement
            : "running"
        if (isStale && status === "running") {
          status = "stopped"
        }

        nextVehicles.push({
          id: rowId,
          vehicleNumber: live.imei || rowId,
          organizationId: toOrganizationId(live) || undefined,
          driver: "Unassigned",
          date:
            live.updatedAt || live.gpsTimestamp
              ? new Date(live.updatedAt || live.gpsTimestamp).toLocaleString("en-GB").replace(",", "")
              : "N/A",
          speed: isStale ? 0 : Number(live.currentSpeed ?? live.speed ?? 0),
          status,
          ign: Boolean(live.ignitionStatus ?? live.ignition ?? false),
          ac: Boolean(live.acStatus ?? false),
          pw: Boolean(live.mainPowerStatus ?? false),
          gps: true,
          location: live.currentLocation || "Live device",
          poi: "-",
          route,
          batteryVoltage: live?.internalBatteryVoltage ?? null,
          batteryPercent: live?.batteryLevel ?? null,
          satelliteCount: live?.numberOfSatellites ?? null,
          gsmSignal: live?.gsmSignalStrength ?? null,
        })
      })

      const filtered = nextVehicles.filter((vehicle) => {
        if (userRole === "driver" && assignedVehicleId && vehicle.id !== assignedVehicleId) return false
        if (selectedOrgId !== "all" && selectedOrgId && vehicle.organizationId !== selectedOrgId) return false
        return true
      })

      const same =
        previous.length === filtered.length &&
        previous.every((prevVehicle, index) => {
          const nextVehicle = filtered[index]
          if (!nextVehicle) return false
          const prevLast = prevVehicle.route[prevVehicle.route.length - 1]
          const nextLast = nextVehicle.route[nextVehicle.route.length - 1]
          return (
            prevVehicle.id === nextVehicle.id &&
            prevVehicle.status === nextVehicle.status &&
            prevVehicle.speed === nextVehicle.speed &&
            prevVehicle.date === nextVehicle.date &&
            prevVehicle.gps === nextVehicle.gps &&
            prevVehicle.location === nextVehicle.location &&
            prevLast?.lat === nextLast?.lat &&
            prevLast?.lng === nextLast?.lng &&
            prevVehicle.route.length === nextVehicle.route.length
          )
        })

      return same ? previous : filtered
    })
  }, [allVehicles, liveByVehicleId, userRole, assignedVehicleId, selectedOrgId, clockMs])

  const currentVehicle = uiVehicles.find((vehicle) => vehicle.id === selectedVehicle) || uiVehicles[0] || null
  const todayDate = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }, [])
  const { data: dailyStatsRes } = useGetVehicleDailyStatsByDateQuery(
    {
      vehicleId: currentVehicle?.id || "",
      date: todayDate,
    },
    {
      skip: !currentVehicle?.id,
      refetchOnMountOrArgChange: true,
      pollingInterval: 30000,
    },
  )
  const dailyStats = dailyStatsRes?.data || null

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
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-950 font-sans text-slate-100">
      <Header
        onVehicleCreated={handleVehicleCreated}
        messageCount={alerts.length}
        notificationCount={notificationCount}
        vehicleSummary={{
          label: currentVehicle?.vehicleNumber || "Vehicle",
          speed: currentVehicle?.speed || 0,
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

      <div className="relative flex flex-1 flex-col overflow-y-auto">
        <div className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-5">
          <div className="lg:col-span-3 h-[20rem] md:h-[24rem] lg:h-[30rem] min-h-0 overflow-hidden">
            <VehicleSidebar
              vehicles={uiVehicles}
              selectedId={selectedVehicle}
              onSelect={(id) => setSelectedVehicle(id === selectedVehicle ? null : id)}
              isFullWidth={false}
              statusFilter={statusFilter}
            />
          </div>

          <div className="lg:col-span-2 h-[20rem] md:h-[24rem] lg:h-[30rem] min-h-0 overflow-hidden border border-white/10 bg-slate-950">
            <div className="flex h-full w-full flex-col">
              <ActionToolbar compact className="border-b border-white/10" alertCount={notificationCount} />
              <div className="flex-1 min-h-0">
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
          <div className="border-t border-white/10 bg-slate-950 p-2">
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_2fr]">
              <div className="min-h-0">
                <ActivityStats
                  vehicles={uiVehicles}
                  alertCount={alerts.length}
                  alerts={alerts}
                  selectedVehicleId={selectedVehicle}
                  compact
                  dailyStats={dailyStats}
                />
              </div>
              <div className="min-h-0">
                <VehicleDetails vehicleId={selectedVehicle} positions={positions} vehicles={uiVehicles} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
