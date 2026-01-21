import { baseApi } from "./baseApi";

export const deviceMappingApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDeviceMappings: builder.query({
            query: () => "/deviceMapping",
            providesTags: ["DeviceMapping"],
        }),
        assignDevice: builder.mutation({
            query: (body) => ({
                url: "/deviceMapping",
                method: "POST",
                body,
            }),
            invalidatesTags: ["DeviceMapping", "Vehicle", "GPSDevice"],
        }),
        unassignDevice: builder.mutation({
            query: (id) => ({
                url: `/deviceMapping/${id}/unassign`,
                method: "PATCH",
            }),
            invalidatesTags: ["DeviceMapping", "Vehicle", "GPSDevice"],
        }),
        deleteMapping: builder.mutation({
            query: (id) => ({
                url: `/deviceMapping/${id}`,
                method: "DELETE"
            }),
            invalidatesTags: ["DeviceMapping"]
        })
    }),
});

export const {
    useGetDeviceMappingsQuery,
    useAssignDeviceMutation,
    useUnassignDeviceMutation,
    useDeleteMappingMutation
} = deviceMappingApi;
