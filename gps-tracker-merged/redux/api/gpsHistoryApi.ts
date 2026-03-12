import { baseApi } from "./baseApi";

type HistoryQueryParams = {
    vehicleId: string
    from?: string
    to?: string
    page?: number
    limit?: number
}

const buildDateParams = ({ from, to }: { from?: string; to?: string }) => ({
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
})

export const gpsHistoryApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getVehicleHistory: builder.query({
            query: ({ vehicleId, from, to, page = 0, limit = 10000 }) => ({
                url: "/gpshistory",
                params: { vehicleId, from, to, page, limit },
            }),
            providesTags: ["History"],
        }),
        getStatistics: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/statistics/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
        getVehicleStatus: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/vehicle-status/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
        getPlayback: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/playback/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
        getTravelSummary: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/travel-summary/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
        getTripSummary: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/trip-summary/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
        getDaywiseDistance: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/daywise-distance/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
        getAlertSummary: builder.query({
            query: ({ vehicleId, from, to }: HistoryQueryParams) => ({
                url: `/gps-history/alert-summary/${vehicleId}`,
                params: buildDateParams({ from, to }),
            }),
            providesTags: ["History"],
        }),
    }),
});

export const {
    useGetVehicleHistoryQuery,
    useLazyGetVehicleHistoryQuery,
    useGetStatisticsQuery,
    useGetVehicleStatusQuery,
    useGetPlaybackQuery,
    useGetTravelSummaryQuery,
    useGetTripSummaryQuery,
    useGetDaywiseDistanceQuery,
    useGetAlertSummaryQuery,
} = gpsHistoryApi;
