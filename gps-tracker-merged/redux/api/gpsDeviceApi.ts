import { baseApi } from "./baseApi";

export const gpsDeviceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getGpsDevices: builder.query({
            query: () => "/gps-devices",
            providesTags: ["GPSDevice"],
        }),
        getGpsDevice: builder.query({
            query: (id) => `/gps-devices/${id}`,
            providesTags: ["GPSDevice"],
        }),
        createGpsDevice: builder.mutation({
            query: (body) => ({
                url: "/gps-devices",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        updateGpsDevice: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/gps-devices/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        deleteGpsDevice: builder.mutation({
            query: (id) => ({
                url: `/gps-devices/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["GPSDevice"],
        }),
    }),
});

export const {
    useGetGpsDevicesQuery,
    useGetGpsDeviceQuery,
    useCreateGpsDeviceMutation,
    useUpdateGpsDeviceMutation,
    useDeleteGpsDeviceMutation,
} = gpsDeviceApi;
