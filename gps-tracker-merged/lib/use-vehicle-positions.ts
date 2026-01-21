"use client"

import { useEffect, useState } from "react"
import { vehicles } from "@/lib/vehicles"

export type VehiclePositions = Record<
  string,
  {
    index: number
    lat: number
    lng: number
  }
>

export function useVehiclePositions() {
  const [positions, setPositions] = useState<VehiclePositions>(() => {
    const initial: VehiclePositions = {}
    vehicles.forEach((vehicle) => {
      const initialIndex = vehicle.status === "running" ? 0 : vehicle.route.length - 1
      const point = vehicle.route[initialIndex]
      initial[vehicle.id] = { index: initialIndex, lat: point.lat, lng: point.lng }
    })
    return initial
  })

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions((prev) => {
        const next: VehiclePositions = { ...prev }
        vehicles.forEach((vehicle) => {
          if (vehicle.status !== "running") return
          const currentIndex = prev[vehicle.id]?.index ?? 0
          const nextIndex = (currentIndex + 1) % vehicle.route.length
          const point = vehicle.route[nextIndex]
          next[vehicle.id] = { index: nextIndex, lat: point.lat, lng: point.lng }
        })
        return next
      })
    }, 1500)

    return () => clearInterval(interval)
  }, [])

  return positions
}
