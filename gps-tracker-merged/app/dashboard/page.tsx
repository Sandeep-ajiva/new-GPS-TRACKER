"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { createPortal } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/dashboard/header"
import { StatusCards, VehicleStatusFilter } from "@/components/dashboard/status-cards"
import { ActionToolbar } from "@/components/dashboard/action-toolbar"
import { VehicleSidebar } from "@/components/dashboard/vehicle-sidebar"
import { MapWrapper } from "@/components/dashboard/map-wrapper"
import { VehicleDetails } from "@/components/dashboard/vehicle-details"
import { useVehiclePositions } from "@/lib/use-vehicle-positions"
import { type Vehicle } from "@/lib/vehicles"
import { useGetVehiclesQuery } from "@/redux/api/vehicleApi"
import { useGetNotificationsQuery } from "@/redux/api/notificationsApi"
import { useGetMeQuery } from "@/redux/api/usersApi"
import { useGetOrganizationsQuery } from "@/redux/api/organizationApi"
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi"
import { useGetVehicleDailyStatsByDateQuery } from "@/redux/api/vehicleDailyStatsApi"
import { LayoutDashboard, ChevronDown } from "lucide-react"
import { getSecureItem } from "@/app/admin/Helpers/encryptionHelper"
import { useSocket } from "@/hooks/useSocket"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import { setActiveTab, setSelectedVehicle as setReduxSelectedVehicle } from "@/redux/features/vehicleSlice"
import { useDashboardContext } from "@/components/dashboard/DashboardContext"
import { ReportView } from "@/components/dashboard/modules/ReportView"
import { GeofenceView } from "@/components/dashboard/modules/GeofenceView"
import { LicensingView } from "@/components/dashboard/modules/LicensingView"
import { AlertView } from "@/components/dashboard/modules/AlertView"
import { FuelView } from "@/components/dashboard/modules/FuelView"
import { TemperatureView } from "@/components/dashboard/modules/TemperatureView"
import { X } from "lucide-react"

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
  fuelPercentage?: number
  temperature?: string
  poi?: string
}

const LIVE_STALE_TIMEOUT_MS = 60 * 1000

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: vehData } = useGetVehiclesQuery({ page: 0, limit: 1000 })
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
  const { data: orgData } = useGetOrganizationsQuery({ page: 0, limit: 1000 })
  const dispatch = useAppDispatch()
  const { selectedVehicleId: reduxSelectedVehicleId, activeTab } = useAppSelector((state) => state.vehicle)
  const { selectedVehicle, setSelectedVehicle } = useDashboardContext()

  const [liveByVehicleId, setLiveByVehicleId] = useState<Record<string, LiveGpsItem>>({})
  const [uiVehicles, setUiVehicles] = useState<Vehicle[]>([])
  const positions = useVehiclePositions(uiVehicles)
  const [isAuthed, setIsAuthed] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)

  const [mobileView, setMobileView] = useState<"list" | "map">("list")
  const [statusFilter, setStatusFilter] = useState<VehicleStatusFilter>("total")
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all")
  const [isOrgOpen, setIsOrgOpen] = useState(false)
  const [clockMs, setClockMs] = useState(() => Date.now())
  const user = meData?.data
  const assignedVehicleId = user?.assignedVehicleId?._id || user?.assignedVehicleId || ""
  const organizationIdParam = searchParams.get("organizationId")
  const organizations = useMemo(() => orgData?.organizations || orgData?.data || [], [orgData])
  const allVehicles = useMemo(() => vehData?.vehicles || vehData?.data || [], [vehData])
  const liveVehicles = useMemo(() => liveData?.vehicles || liveData?.data || [], [liveData])
  const alerts = useMemo(() => notifData?.data || [], [notifData])
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

  // Handle click outside for custom dropdown
  useEffect(() => {
    if (!isOrgOpen) return
    const handler = () => setIsOrgOpen(false)
    window.addEventListener("click", handler)
    return () => window.removeEventListener("click", handler)
  }, [isOrgOpen])

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
          driver: vehicle.driverId ? `${vehicle.driverId.firstName} ${vehicle.driverId.lastName}` : "Unassigned",
          driverDetails: vehicle.driverId ? {
            firstName: vehicle.driverId.firstName,
            lastName: vehicle.driverId.lastName,
            phone: vehicle.driverId.phone,
            email: vehicle.driverId.email,
            licenseNumber: vehicle.driverId.licenseNumber,
            address: vehicle.driverId.address
          } : undefined,
          date,
          speed,
          status,
          ign: ignition,
          ac,
          pw: power,
          gps: hasLivePosition || hasVehiclePosition,
          location,
          poi: live?.poi || vehicle.poi || "-",
          route,
          batteryVoltage: live?.internalBatteryVoltage ?? null,
          batteryPercent: live?.batteryLevel ?? null,
          satelliteCount: live?.numberOfSatellites ?? null,
          gsmSignal: live?.gsmSignalStrength ?? null,
          imei: vehicle.imei || vehicle.deviceImei,
          deviceImei: vehicle.deviceImei,
          registrationNumber: vehicle.registrationNumber || vehicle.vehicleNumber,
          make: vehicle.make,
          model: vehicle.model,
          color: vehicle.color,
          year: vehicle.year,
          vehicleType: vehicle.vehicleType,
          fuel: live?.fuelPercentage ?? null,
          temperature: live?.temperature ?? null,
          ais140Compliant: vehicle.ais140Compliant || false,
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
              ? new Date((live.updatedAt || live.gpsTimestamp) as string).toLocaleString("en-GB").replace(",", "")
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
          fuel: live?.fuelPercentage ?? null,
          temperature: live?.temperature ?? null,
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

  const currentVehicleSelection = selectedVehicle || uiVehicles.find((vehicle) => vehicle.id === reduxSelectedVehicleId) || uiVehicles[0] || null
  const currentVehicleId = currentVehicleSelection?.id || null
  const todayDate = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${yyyy}-${mm}-${dd}`
  }, [])
  const { data: dailyStatsRes } = useGetVehicleDailyStatsByDateQuery(
    {
      vehicleId: currentVehicleId || "",
      date: todayDate,
    },
    {
      skip: !currentVehicleId,
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
        vehicleSummary={{
          label: currentVehicleSelection?.vehicleNumber || "Vehicle",
          speed: currentVehicleSelection?.speed || 0,
        }}
      />

      {userRole === "admin" && (
        <div className="border-b border-white/10 bg-slate-950/80 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100">
              Organizations: <span className="text-emerald-200">{organizations.length}</span>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100">
              Vehicles: <span className="text-emerald-200">{allVehicles.length}</span>
            </div>
            <div className="ml-auto flex-1 max-w-xs relative" onClick={(e) => e.stopPropagation()}>
              <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1.5 ml-1">Select Organization</label>
              <div className="relative">
                <button
                  onClick={() => setIsOrgOpen(!isOrgOpen)}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-xs font-bold text-slate-100 transition-all hover:bg-slate-800 hover:border-white/20 active:scale-[0.98]"
                >
                  <LayoutDashboard size={14} className={isOrgOpen ? "text-emerald-400" : "text-slate-400"} />
                  <span className="flex-1 text-left truncate">
                    {selectedOrgId === "all" ? "All Organizations" : organizations.find((o: any) => o._id === selectedOrgId)?.name || "Organization"}
                  </span>
                  <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isOrgOpen ? "rotate-180 text-emerald-400" : ""}`} />
                </button>

                {isOrgOpen && (
                  <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] max-h-60 overflow-y-auto rounded-2xl bg-slate-800 border border-white/10 shadow-2xl ring-1 ring-black/40 z-50 animate-in fade-in slide-in-from-top-2 duration-150 backdrop-blur-xl">
                    <div className="p-1.5">
                      <button
                        onClick={() => { setSelectedOrgId("all"); setIsOrgOpen(false); }}
                        className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${selectedOrgId === "all" ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:bg-white/5"}`}
                      >
                        All Organizations
                      </button>
                      <div className="my-1 h-px bg-white/5" />
                      {organizations.map((org: any) => (
                        <button
                          key={org._id}
                          onClick={() => { setSelectedOrgId(org._id); setIsOrgOpen(false); }}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${selectedOrgId === org._id ? "bg-emerald-500/20 text-emerald-300" : "text-slate-300 hover:bg-white/5"}`}
                        >
                          {org.name || "Organization"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
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
            setReduxSelectedVehicle(null)
            setSelectedVehicle(null)
          }}
        />
        {/* Mobile View Switcher */}
        <div className="flex border-t border-white/5 lg:hidden">
          <button
            onClick={() => setMobileView("list")}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${mobileView === "list" ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:bg-white/5"}`}
          >
            LIST VIEW
          </button>
          <button
            onClick={() => setMobileView("map")}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${mobileView === "map" ? "bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:bg-white/5"}`}
          >
            MAP VIEW
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 p-2 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          {/* Sidebar Area (Left 50%) */}
          <div className={`${mobileView === "list" ? "flex" : "hidden"} lg:flex lg:col-span-6 xl:col-span-6 flex-col min-h-[450px] lg:h-full overflow-hidden border border-white/10 bg-slate-950/50 rounded-2xl shadow-2xl`}>
            <VehicleSidebar
              vehicles={uiVehicles}
              selectedId={reduxSelectedVehicleId || currentVehicleId}
              onSelect={(id) => {
                dispatch(setReduxSelectedVehicle(id === reduxSelectedVehicleId ? null : id))
                if (id === reduxSelectedVehicleId) {
                  setSelectedVehicle(null)
                }
                if (window.innerWidth < 1024) setMobileView("map")
              }}
              isFullWidth={true}
              statusFilter={statusFilter}
            />
          </div>

          {/* Map Area (Right 50%) */}
          <div className={`${mobileView === "map" ? "flex" : "hidden md:flex"} lg:flex lg:col-span-6 xl:col-span-6 flex-col min-h-[450px] lg:h-full overflow-hidden border border-white/10 bg-slate-950 rounded-2xl shadow-2xl`}>
            <ActionToolbar compact className="bg-slate-950/80 backdrop-blur-md border-b border-white/10" />
            <div className="flex-1 min-h-0">
              <MapWrapper />
            </div>
          </div>
        </div>

        {currentVehicleSelection && (
          <div className="border-t border-white/10 bg-slate-950/95 backdrop-blur-xl p-2 shadow-2xl z-40">
            <div className="grid grid-cols-1 gap-2">
              <div className="min-h-0 overflow-x-auto">
                <VehicleDetails 
                  vehicleId={currentVehicleId} 
                  positions={positions} 
                  vehicles={uiVehicles} 
                  selectedVehicleObj={currentVehicleSelection}
                  dailyStats={dailyStats}
                  alerts={alerts}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Module Modal Overlay */}
      {activeTab !== "Tracking" && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-900/50">
              <h3 className="text-xl font-black uppercase tracking-widest text-emerald-400">{activeTab}</h3>
              <button
                onClick={() => dispatch(setActiveTab("Tracking"))}
                className="p-2 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {activeTab === "Reports" && <ReportView />}
              {activeTab === "Geofences" && <GeofenceView />}
              {activeTab === "Licensing" && <LicensingView />}
              {activeTab === "Alerts" && <AlertView />}
              {activeTab === "Fuel" && <FuelView />}
              {activeTab === "Temperature" && <TemperatureView />}
              {/* Add other modules as they are developed */}
              {["Tour", "App Config", "Sys Config", "User Rights"].includes(activeTab) && (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 italic">
                  <LayoutDashboard className="h-12 w-12 mb-4 opacity-20" />
                  {activeTab} module is coming soon...
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
