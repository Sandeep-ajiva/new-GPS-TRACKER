import { baseApi } from "./baseApi";

export type HealthMonitoringRecord = {
  _id: string;
  imei: string;
  vehicleId?: string | { _id: string }
  gpsDeviceId?: string | { _id: string }
  organizationId?: string | { _id: string }
  batteryPercentage?: number
  memoryPercentage?: number
  softwareVersion?: string
  vendorId?: string
  dataUpdateRateIgnitionOn?: number
  dataUpdateRateIgnitionOff?: number
  digitalInputStatus?: string
  analogInputStatus?: string
  lowBatteryThreshold?: number
  timestamp?: string
  receivedAt?: string
}

export type HealthMonitoringResponse = {
  status: boolean
  data: HealthMonitoringRecord[]
  total?: number
}

export type HealthMonitoringLatestResponse = {
  status: boolean
  data: HealthMonitoringRecord | null
}

export const healthMonitoringApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllLatestHealth: builder.query<HealthMonitoringResponse, void>({
      query: () => "/healthmonitoring/latest",
      providesTags: ["HealthMonitoring"],
    }),
    getVehicleLatestHealth: builder.query<HealthMonitoringLatestResponse, string>({
      query: (vehicleId) => `/healthmonitoring/vehicle/${vehicleId}/latest`,
      providesTags: ["HealthMonitoring"],
    }),
    getVehicleHealthHistory: builder.query<HealthMonitoringResponse, { vehicleId: string; from?: string; to?: string }>({
      query: ({ vehicleId, from, to }) => {
        const params = new URLSearchParams();
        if (from) params.set("from", from);
        if (to) params.set("to", to);
        return `/healthmonitoring/vehicle/${vehicleId}/history?${params.toString()}`;
      },
      providesTags: ["HealthMonitoring"],
    }),
  }),
});

export const {
  useGetAllLatestHealthQuery,
  useGetVehicleLatestHealthQuery,
  useGetVehicleHealthHistoryQuery,
} = healthMonitoringApi;