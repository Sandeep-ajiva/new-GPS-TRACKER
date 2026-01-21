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

    const polylinePositions = pathData.map((p) => [p.lat, p.lng]);
    const center = polylinePositions.length > 0 ? polylinePositions[0] : [20.5937, 78.9629];

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
            {pathData.length > 0 && (
                <Marker position={[pathData[0].lat, pathData[0].lng] as L.LatLngExpression} icon={icon}>
                    <Popup>Start Point: {new Date(pathData[0].timestamp).toLocaleString()}</Popup>
                </Marker>
            )}

            {/* End Marker */}
            {pathData.length > 1 && (
                <Marker position={[pathData[pathData.length - 1].lat, pathData[pathData.length - 1].lng] as L.LatLngExpression} icon={icon}>
                    <Popup>End Point: {new Date(pathData[pathData.length - 1].timestamp).toLocaleString()}</Popup>
                </Marker>
            )}
        </MapContainer>
    );
}
