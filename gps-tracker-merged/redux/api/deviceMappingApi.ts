import { baseApi } from "./baseApi";

export const deviceMappingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDeviceMappings: builder.query({
            query: () => "/vehicleMapping/active",
            providesTags: ["DeviceMapping"],
        }),
        getAllMappings: builder.query({
            query: () => "/vehicleMapping",
            providesTags: ["DeviceMapping"],
        }),
        assignDevice: builder.mutation({
            query: (body) => ({
                url: "/vehicleMapping/assign",
                method: "POST",
                body,
            }),
            invalidatesTags: ["DeviceMapping", "Vehicle", "GPSDevice"],
        }),
        unassignDevice: builder.mutation({
            query: (body) => ({
                url: "/vehicleMapping/unassign",
                method: "POST",
                body,
            }),
            invalidatesTags: ["DeviceMapping", "Vehicle", "GPSDevice"],
        }),
    }),
});

export const {
    useGetDeviceMappingsQuery,
    useGetAllMappingsQuery,
    useAssignDeviceMutation,
    useUnassignDeviceMutation,
} = deviceMappingApi;
