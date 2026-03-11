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
  driverDetails?: {
    firstName: string
    lastName: string
    phone: string
    email: string
    licenseNumber: string
    address?: string
    hasData?: boolean
  }
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
  batteryVoltage?: number | null
  batteryPercent?: number | null
  satelliteCount?: number | null
  gsmSignal?: number | null
  imei?: string
  deviceId?: string
  gpsDeviceId?: any
  deviceImei?: string
  registrationNumber?: string
  make?: string
  model?: string
  color?: string
  year?: string
  vehicleType?: string
  ais140Compliant?: boolean
  ais140CertificateNumber?: string
  fuel?: number | null
  temperature?: string | null
}

export const vehicles: Vehicle[] = []
