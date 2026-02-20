import { baseApi } from "./baseApi";

export const vehicleDailyStatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getVehicleDailyStatsByDate: builder.query({
      query: ({ vehicleId, date }: { vehicleId: string; date: string }) =>
        `/vehicleDailyStats/vehicle/${vehicleId}/date/${date}`,
      providesTags: ["History"],
    }),
  }),
});

export const { useGetVehicleDailyStatsByDateQuery } = vehicleDailyStatsApi;
