export type VehicleStatus = "running" | "idle" | "stopped"

export type VehicleRoutePoint = {
  lat: number
  lng: number
}

export type Vehicle = {
  id: string
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

export const vehicles: Vehicle[] = [
  {
    id: "DL 10CK1840",
    driver: "Dave Mathew",
    date: "22-12-2023 15:00:00",
    speed: 0,
    status: "stopped",
    ign: false,
    ac: false,
    pw: false,
    gps: true,
    location: "Sports Complex, Kair, Delhi",
    poi: "-",
    route: [
      { lat: 28.6197, lng: 76.9289 },
      { lat: 28.6204, lng: 76.9296 },
      { lat: 28.6212, lng: 76.9309 },
      { lat: 28.6218, lng: 76.9321 },
      { lat: 28.6221, lng: 76.9332 },
    ],
  },
  {
    id: "DL 10CK1841",
    driver: "Mitchell",
    date: "22-12-2023 15:00:00",
    speed: 46,
    status: "running",
    ign: true,
    ac: true,
    pw: true,
    gps: true,
    location: "Sports Complex, Kair, Delhi",
    poi: "Station",
    route: [
      { lat: 28.625, lng: 76.935 },
      { lat: 28.6256, lng: 76.9366 },
      { lat: 28.6264, lng: 76.9382 },
      { lat: 28.6276, lng: 76.9395 },
      { lat: 28.6282, lng: 76.9408 },
      { lat: 28.6291, lng: 76.942 },
    ],
  },
  {
    id: "DL 10CK1842",
    driver: "Olivia",
    date: "22-12-2023 15:00:00",
    speed: 0,
    status: "idle",
    ign: true,
    ac: false,
    pw: false,
    gps: true,
    location: "Sports Complex, Kair, Delhi",
    poi: "-",
    route: [
      { lat: 28.63, lng: 76.94 },
      { lat: 28.6305, lng: 76.9412 },
      { lat: 28.631, lng: 76.9424 },
      { lat: 28.6317, lng: 76.9434 },
      { lat: 28.6321, lng: 76.9446 },
    ],
  },
  {
    id: "DL 10CK1843",
    driver: "Ravi",
    date: "22-12-2023 15:00:00",
    speed: 38,
    status: "running",
    ign: true,
    ac: true,
    pw: true,
    gps: true,
    location: "Sports Complex, Kair, Delhi",
    poi: "Gate 2",
    route: [
      { lat: 28.615, lng: 76.945 },
      { lat: 28.6159, lng: 76.9461 },
      { lat: 28.6167, lng: 76.9475 },
      { lat: 28.6174, lng: 76.949 },
      { lat: 28.6182, lng: 76.9501 },
      { lat: 28.6191, lng: 76.9514 },
    ],
  },
  {
    id: "DL 10CK1844",
    driver: "Asha",
    date: "22-12-2023 15:00:00",
    speed: 0,
    status: "stopped",
    ign: false,
    ac: false,
    pw: false,
    gps: false,
    location: "Sports Complex, Kair, Delhi",
    poi: "-",
    route: [
      { lat: 28.62, lng: 76.95 },
      { lat: 28.6206, lng: 76.951 },
      { lat: 28.6214, lng: 76.9523 },
      { lat: 28.6219, lng: 76.9531 },
      { lat: 28.6225, lng: 76.9544 },
    ],
  },
  {
    id: "DL 10CK1845",
    driver: "Karan",
    date: "22-12-2023 15:00:00",
    speed: 54,
    status: "running",
    ign: true,
    ac: false,
    pw: true,
    gps: true,
    location: "Sports Complex, Kair, Delhi",
    poi: "Depot",
    route: [
      { lat: 28.6124, lng: 76.9367 },
      { lat: 28.6132, lng: 76.9378 },
      { lat: 28.6141, lng: 76.9391 },
      { lat: 28.6152, lng: 76.9402 },
      { lat: 28.6165, lng: 76.9416 },
      { lat: 28.6178, lng: 76.9429 },
    ],
  },
  {
    id: "DL 10CK1846",
    driver: "Neha",
    date: "22-12-2023 15:00:00",
    speed: 0,
    status: "idle",
    ign: false,
    ac: false,
    pw: false,
    gps: false,
    location: "Unknown",
    poi: "-",
    route: [
      { lat: 28.6099, lng: 76.927 },
      { lat: 28.6104, lng: 76.928 },
      { lat: 28.611, lng: 76.9292 },
      { lat: 28.6118, lng: 76.9305 },
      { lat: 28.6123, lng: 76.9317 },
    ],
  },
]
