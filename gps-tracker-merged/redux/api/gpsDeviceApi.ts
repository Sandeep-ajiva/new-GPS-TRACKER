import { baseApi } from "./baseApi";
import type { InventoryFilters, InventoryUpdatePayload } from "@/components/gps-devices/inventoryTypes";

type GpsEntityRef =
    | string
    | {
        _id?: string;
        name?: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        vehicleNumber?: string;
        registrationNumber?: string;
        plateNumber?: string;
    }
    | null
    | undefined;

export interface GpsDeviceConfiguration {
    apn?: string | null;
    updateRateIgnitionOn?: string | number | null;
    updateRateIgnitionOff?: string | number | null;
    updateRateSleepMode?: string | number | null;
    updateRateEmergency?: string | number | null;
    updateRateHealth?: string | number | null;
    speedLimit?: string | number | null;
    harshBrakeThreshold?: string | number | null;
    harshAccelerationThreshold?: string | number | null;
    rashTurningThreshold?: string | number | null;
    lowBatteryThreshold?: string | number | null;
    tiltAngle?: string | number | null;
    sleepTime?: string | number | null;
    turnByTurnTracking?: boolean | null;
    relayEnabled?: boolean | null;
    boxEventDisabled?: boolean | null;
    smsEnabled?: boolean | null;
}

export interface GpsDeviceDetails {
    _id: string;
    organizationId?: GpsEntityRef;
    vehicleId?: GpsEntityRef;
    imei?: string;
    deviceModel?: string;
    model?: string;
    manufacturer?: string;
    simNumber?: string;
    serialNumber?: string;
    vendorId?: string;
    connectionStatus?: string | null;
    isOnline?: boolean | null;
    lastSeen?: string | null;
    lastLoginTime?: string | null;
    softwareVersion?: string;
    firmwareVersion?: string;
    hardwareVersion?: string;
    inventory?: Record<string, unknown> | null;
    configuration?: GpsDeviceConfiguration | null;
    status?: string;
    createdAt?: string | null;
    updatedAt?: string | null;
    vehicleNumber?: string;
    registrationNumber?: string;
    vehicleRegistrationNumber?: string;
    plateNumber?: string;
}

export type GpsDeviceDetailsResponse =
    | GpsDeviceDetails
    | {
        data?: GpsDeviceDetails | null;
        message?: string;
        status?: boolean;
    };

export const extractGpsDeviceDetails = (
    payload: GpsDeviceDetailsResponse | null | undefined,
): GpsDeviceDetails | null => {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    if ("data" in payload) {
        const nested = payload.data;
        return nested && typeof nested === "object" ? nested : null;
    }

    return payload;
};

export const gpsDeviceApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getGpsDevices: builder.query({
            query: (params) => ({
                url: "/gpsdevice",
                params,
            }),
            providesTags: ["GPSDevice"],
        }),
        getGpsDevice: builder.query<GpsDeviceDetailsResponse, string>({
            query: (id) => `/gpsdevice/${id}`,
            providesTags: ["GPSDevice"],
        }),
        createGpsDevice: builder.mutation({
            query: (body) => ({
                url: "/gpsdevice",
                method: "POST",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        updateGpsDevice: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/gpsdevice/${id}`,
                method: "PUT",
                body,
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        deleteGpsDevice: builder.mutation({
            query: (id) => ({
                url: `/gpsdevice/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["GPSDevice"],
        }),
        getGpsDeviceInventory: builder.query({
            query: (params?: Partial<InventoryFilters> & { page?: number; limit?: number; search?: string }) => {
                const queryParams: Record<string, string | number> = {};

                if (params?.page !== undefined) queryParams.page = params.page;
                if (params?.limit !== undefined) queryParams.limit = params.limit;
                if (params?.search) queryParams.search = params.search;
                if (params?.inventoryStatus) queryParams["inventory.status"] = params.inventoryStatus;
                if (params?.manufacturer) queryParams.manufacturer = params.manufacturer;
                if (params?.supplierName) queryParams.supplierName = params.supplierName;
                if (params?.warrantyExpiry) queryParams.warrantyExpiry = params.warrantyExpiry;

                return {
                    url: "/gps-device/inventory",
                    params: queryParams,
                };
            },
            providesTags: ["GPSDevice"],
        }),
        getGpsDeviceInventoryById: builder.query({
            query: (id) => `/gps-device/inventory/${id}`,
            providesTags: ["GPSDevice"],
        }),
        updateGpsDeviceInventory: builder.mutation({
            query: ({ id, inventory }: { id: string; inventory: InventoryUpdatePayload }) => ({
                url: `/gps-device/inventory/${id}`,
                method: "PATCH",
                body: { inventory },
            }),
            invalidatesTags: ["GPSDevice"],
        }),
    }),
});

export const {
    useGetGpsDevicesQuery,
    useGetGpsDeviceQuery,
    useCreateGpsDeviceMutation,
    useUpdateGpsDeviceMutation,
    useDeleteGpsDeviceMutation,
    useGetGpsDeviceInventoryQuery,
    useGetGpsDeviceInventoryByIdQuery,
    useUpdateGpsDeviceInventoryMutation,
} = gpsDeviceApi;
