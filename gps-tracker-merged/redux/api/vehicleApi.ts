import { baseApi } from "./baseApi";

export const vehicleApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // getVehicles: builder.query({
    //   query: (params?: { page?: number; limit?: number; status?: string }params) => ({
    //     url: {
    //     if (!params) return "/vehicle";
    //     const query = new URLSearchParams();
    //     if (params.page) query.set("page", String(params.page));
    //     if (params.limit) query.set("limit", String(params.limit));
    //     if (params.status && params.status !== "all") query.set("status", params.status);
    //     const qs = query.toString();
    //     return qs ? `/vehicle?${qs}` : "/vehicle";
    //   },
    //     params,
    //   }),
    //   providesTags: ["Vehicle"],
    // }),
    getVehicle: builder.query({
      query: (id: string) => `/vehicle/${id}`,
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
      query: (payload: { id: string;[key: string]: unknown }) => {
        const { id, ...rest } = payload;
        return {
          url: `/vehicle/${id}`,
          method: "PUT",
          body: rest,
        };
      },
      invalidatesTags: ["Vehicle"],
    }),
    deleteVehicle: builder.mutation({
      query: (id: string) => ({
        url: `/vehicle/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Vehicle"],
    }),
    getGeofences: builder.query({
      query: () => "/geofence",
      providesTags: ["Geofence"],
    }),
  }),
});

export const {
  useGetVehiclesQuery,
  useGetVehicleQuery,
  useCreateVehicleMutation,
  useUpdateVehicleMutation,
  useDeleteVehicleMutation,
  useGetGeofencesQuery,
} = vehicleApi;
