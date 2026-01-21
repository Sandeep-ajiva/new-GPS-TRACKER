import { baseApi } from "./baseApi";

export const gpsLiveApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getLiveVehicles: builder.query({
            query: () => "/gps-live",
            providesTags: ["Tracking"],
        }),
    }),
});

export const { useGetLiveVehiclesQuery } = gpsLiveApi;
