import { baseApi } from "./baseApi";

export const gpsLiveApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getLiveVehicles: builder.query({
            query: () => "/gpsLiveData",
            providesTags: ["Tracking"],
        }),
        getLiveVehicleByDeviceId: builder.query({
            query: (deviceId) => `/gpsLiveData/device/${deviceId}`,
            providesTags: ["Tracking"],
        }),
    }),
});

export const { useGetLiveVehiclesQuery, useGetLiveVehicleByDeviceIdQuery } = gpsLiveApi;
