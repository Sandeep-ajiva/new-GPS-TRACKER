import { baseApi } from "./baseApi";

export const driversApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDrivers: builder.query({
      query: () => "/drivers",
      providesTags: ["Driver"],
    }),
  }),
});

export const { useGetDriversQuery } = driversApi;
