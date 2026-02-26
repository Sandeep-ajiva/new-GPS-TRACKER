import { baseApi } from "./baseApi";

export const gpsHistoryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getVehicleHistory: builder.query({
            query: ({ vehicleId, from, to }) => ({
                url: "/gpshistory",
                params: { vehicleId, from, to },
            }),
            providesTags: ["History"],
        }),
    }),
});

export const { useGetVehicleHistoryQuery, useLazyGetVehicleHistoryQuery } = gpsHistoryApi;
