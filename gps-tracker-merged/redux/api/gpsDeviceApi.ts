import { baseApi } from "./baseApi";

export const gpsDeviceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getGpsDevices: builder.query({
            query: () => "/gpsDevice",
            providesTags: ["GPSDevice"],
        }),
        getGpsDevice: builder.query({
            query: (id) => `/gpsDevice/${id}`,
            providesTags: ["GPSDevice"],
        }),
        createGpsDevice: builder.mutation({
            query: (body) => ({
                url: "/gpsDevice",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        updateGpsDevice: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/gpsDevice/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        deleteGpsDevice: builder.mutation({
            query: (id) => ({
                url: `/gpsDevice/${id}`,
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
