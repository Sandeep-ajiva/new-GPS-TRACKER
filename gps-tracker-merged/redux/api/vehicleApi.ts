import { baseApi } from "./baseApi";

export const vehicleApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getVehicles: builder.query({
            query: () => "/vehicle",
            providesTags: ["Vehicle"],
        }),
        getVehicle: builder.query({
            query: (id) => `/vehicle/${id}`,
            providesTags: ["Vehicle"],
        }),
        createVehicle: builder.mutation({
            query: (body) => ({
                url: "/vehicle",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Vehicle"],
        }),
        updateVehicle: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/vehicle/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Vehicle"],
        }),
        deleteVehicle: builder.mutation({
            query: (id) => ({
                url: `/vehicle/${id}`,
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
