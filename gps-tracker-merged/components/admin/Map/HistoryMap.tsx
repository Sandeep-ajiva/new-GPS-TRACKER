"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
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

interface HistoryMapProps {
    pathData: any[];
}

export default function HistoryMap({ pathData }: HistoryMapProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) {
        return <div className="h-full w-full bg-gray-100 flex items-center justify-center">Loading Map...</div>;
    }

    const polylinePositions = pathData
        .map((p) => [p.latitude ?? p.lat, p.longitude ?? p.lng])
        .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
    const center =
        polylinePositions.length > 0 ? polylinePositions[0] : [20.5937, 78.9629];

    return (
        <MapContainer
            center={center as L.LatLngExpression}
            zoom={13}
            style={{ height: "100%", width: "100%", borderRadius: "1rem" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {polylinePositions.length > 0 && (
                <Polyline positions={polylinePositions as L.LatLngExpression[]} color="blue" />
            )}

            {/* Start Marker */}
            {polylinePositions.length > 0 && (
                <Marker position={polylinePositions[0] as L.LatLngExpression} icon={icon}>
                    <Popup>Start Point</Popup>
                </Marker>
            )}

            {/* End Marker */}
            {polylinePositions.length > 1 && (
                <Marker
                    position={polylinePositions[polylinePositions.length - 1] as L.LatLngExpression}
                    icon={icon}
                >
                    <Popup>End Point</Popup>
                </Marker>
            )}
        </MapContainer>
    );
}
