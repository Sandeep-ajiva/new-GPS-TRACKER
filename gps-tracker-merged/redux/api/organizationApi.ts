import { baseApi } from "./baseApi";

export const organizationApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOrganizations: builder.query({
            query: () => "/organizations",
            providesTags: ["Organization"],
        }),
        getOrganization: builder.query({
            query: (id) => `/organizations/${id}`,
            providesTags: ["Organization"],
        }),
        createOrganization: builder.mutation({
            query: (body) => ({
                url: "/organizations",
                method: "POST",
                body,
            }),
            invalidatesTags: ["Organization"],
        }),
        updateOrganization: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/organizations/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["Organization"],
        }),
        deleteOrganization: builder.mutation({
            query: (id) => ({
                url: `/organizations/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Organization"],
        }),
    }),
});

export const {
    useGetOrganizationsQuery,
    useGetOrganizationQuery,
    useCreateOrganizationMutation,
    useUpdateOrganizationMutation,
    useDeleteOrganizationMutation,
} = organizationApi;
