import { baseApi } from "./baseApi";

export const usersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getUsers: builder.query({
            query: () => "/users/admins",
            providesTags: ["User"],
        }),
        createUser: builder.mutation({
            query: (body) => ({
                url: "/users/orgadmin",
                method: "POST",
                body,
            }),
            invalidatesTags: ["User"],
        }),
        updateUser: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/users/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["User"],
        }),
        deleteUser: builder.mutation({
            query: (id) => ({
                url: `/users/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["User"],
        }),
    }),
});

export const {
    useGetUsersQuery,
    useCreateUserMutation,
    useUpdateUserMutation,
    useDeleteUserMutation,
} = usersApi;
