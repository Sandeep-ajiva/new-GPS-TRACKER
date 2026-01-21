import { baseApi } from "./baseApi";

export const vehicleApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getVehicles: builder.query({
            query: () => "/vehicles",
            providesTags: ["Vehicle"],
        }),
        getVehicle: builder.query({
            query: (id) => `/vehicles/${id}`,
            providesTags: ["Vehicle"],
        }),
        createVehicle: builder.mutation({
            query: (body) => ({
                url: "/vehicles",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Vehicle"],
        }),
        updateVehicle: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/vehicles/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Vehicle"],
        }),
        deleteVehicle: builder.mutation({
            query: (id) => ({
                url: `/vehicles/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Vehicle"],
        }),
    }),
});

export const {
    useGetVehiclesQuery,
    useGetVehicleQuery,
    useCreateVehicleMutation,
    useUpdateVehicleMutation,
    useDeleteVehicleMutation,
} = vehicleApi;
