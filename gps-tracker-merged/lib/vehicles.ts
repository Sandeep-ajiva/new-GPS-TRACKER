export type VehicleStatus = "running" | "idle" | "stopped" | "inactive" | "nodata"

export type VehicleRoutePoint = {
  lat: number
  lng: number
}

export type Vehicle = {
  id: string
  vehicleNumber?: string
  organizationId?: string
  driver: string
  date: string
  speed: number
  status: VehicleStatus
  ign: boolean
  ac: boolean
  pw: boolean
  gps: boolean
  location: string
  poi: string
  route: VehicleRoutePoint[]
}

export const vehicles: Vehicle[] = []
