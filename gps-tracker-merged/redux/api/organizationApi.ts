import { baseApi } from "./baseApi";

export const organizationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganizations: builder.query({
      query: () => "/organizations",
      providesTags: ["Organization"],
    }),
    getSubOrganizations: builder.query({
      query: (parentId) =>
        `/organizations/sub${parentId ? `?parentId=${parentId}` : ""}`,
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
    createSubOrganization: builder.mutation({
      query: (body) => ({
        url: "/organizations/sub-organization",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Organization"],
    }),
    createSubOrgWithManager: builder.mutation({
      query: (body) => ({
        url: "/organizations/with-manager",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Organization", "User"],
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
  useGetSubOrganizationsQuery,
  useGetOrganizationQuery,
  useCreateOrganizationMutation,
  useCreateSubOrganizationMutation,
  useCreateSubOrgWithManagerMutation,
  useUpdateOrganizationMutation,
  useDeleteOrganizationMutation,
} = organizationApi;
