import { baseApi } from "./baseApi";

export const gpsHistoryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getVehicleHistory: builder.query({
            query: ({ vehicleId, from, to, page = 0, limit = 10000 }) => ({
                url: "/gpshistory",
                params: { vehicleId, from, to, page, limit },
            }),
            providesTags: ["History"],
        }),
    }),
});

export const { useGetVehicleHistoryQuery, useLazyGetVehicleHistoryQuery } = gpsHistoryApi;
