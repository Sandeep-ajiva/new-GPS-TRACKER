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

export default function DashboardMap() {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />;
    }

    return (
        <MapContainer
            center={[20.5937, 78.9629]} // Center of India
            zoom={5}
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Example Marker */}
            <Marker position={[28.6139, 77.209]} icon={icon}>
                <Popup>New Delhi - Vehicle: KA-01-AB-1234</Popup>
            </Marker>
        </MapContainer>
    );
}
