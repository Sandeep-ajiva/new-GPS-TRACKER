"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setLiveVehicles, updateVehicleLocation, setConnectionStatus } from "@/redux/features/liveTrackingSlice";
import { useGetLiveVehiclesQuery } from "@/redux/api/gpsLiveApi";
import { io } from "socket.io-client";

// Fix for default marker icon in Next.js
const icon = L.icon({
    iconUrl: "/images/marker-icon.png",
    shadowUrl: "/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export default function LiveMap() {
    const dispatch = useAppDispatch();
    const { liveVehicles } = useAppSelector((state: any) => state.liveTracking);
    const { data: initialData } = useGetLiveVehiclesQuery({});
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

        // Initial Data Load
        if (initialData) {
            dispatch(setLiveVehicles(initialData));
        }

        // Socket Connection
        const socket = io(); // Connects to same host by default

        socket.on("connect", () => {
            console.log("Socket Connected");
            dispatch(setConnectionStatus(true));
        });

        socket.on("disconnect", () => {
            console.log("Socket Disconnected");
            dispatch(setConnectionStatus(false));
        });

        socket.on("gps_update", (data: any) => {
            dispatch(updateVehicleLocation(data));
        });

        return () => {
            socket.disconnect();
        }
    }, [dispatch, initialData]);

    if (!isMounted) {
        return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading Map...</div>;
    }

    return (
        <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {liveVehicles.map((vehicle: any) => (
                vehicle.lat && vehicle.lng ? (
                    <Marker key={vehicle.vehicleId} position={[vehicle.lat, vehicle.lng]} icon={icon}>
                        <Popup>
                            <div className="text-sm font-bold">{vehicle.vehicleNumber}</div>
                            <div className="text-xs">Speed: {vehicle.speed} km/h</div>
                            <div className="text-xs">Last Updated: {new Date(vehicle.lastUpdated).toLocaleTimeString()}</div>
                        </Popup>
                    </Marker>
                ) : null
            ))}
        </MapContainer>
    );
}
