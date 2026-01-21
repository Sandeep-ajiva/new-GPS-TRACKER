"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";

// Fix for default marker icon in Next.js
const icon = L.icon({
    iconUrl: "/images/marker-icon.png",
    shadowUrl: "/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

type LiveVehicle = {
    id: string;
    vehicleNumber: string;
    lat: number;
    lng: number;
    speed: number;
    lastUpdated: string;
};

const demoVehicles: LiveVehicle[] = [
    {
        id: "veh_1",
        vehicleNumber: "DL 10CK1840",
        lat: 28.6139,
        lng: 77.209,
        speed: 42,
        lastUpdated: new Date().toISOString(),
    },
    {
        id: "veh_2",
        vehicleNumber: "PB 10AX2234",
        lat: 28.7041,
        lng: 77.1025,
        speed: 0,
        lastUpdated: new Date().toISOString(),
    },
];

export default function LiveMap({ vehicles = demoVehicles }: { vehicles?: LiveVehicle[] }) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);

    }, []);

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
            {vehicles.map((vehicle) => (
                vehicle.lat && vehicle.lng ? (
                    <Marker key={vehicle.id} position={[vehicle.lat, vehicle.lng]} icon={icon}>
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
