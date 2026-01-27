import { baseApi } from "./baseApi";

export const gpsDeviceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getGpsDevices: builder.query({
            query: () => "/gpsdevice",
            providesTags: ["GPSDevice"],
        }),
        getGpsDevice: builder.query({
            query: (id) => `/gpsdevice/${id}`,
            providesTags: ["GPSDevice"],
        }),
        createGpsDevice: builder.mutation({
            query: (body) => ({
                url: "/gpsdevice",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        updateGpsDevice: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/gpsdevice/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        deleteGpsDevice: builder.mutation({
            query: (id) => ({
                url: `/gpsdevice/${id}`,
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
