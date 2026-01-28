"use client";

import { GoogleMap, InfoWindow, Marker, useLoadScript } from "@react-google-maps/api";
import { useState } from "react";

export default function DashboardMap() {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey || "",
    });
    const [showInfo, setShowInfo] = useState(true);

    if (!apiKey) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-500">
                Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to load Google Maps.
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-500">
                Unable to load Google Maps. Check the API key and billing settings.
            </div>
        );
    }

    if (!isLoaded) {
        return <div className="h-full w-full animate-pulse rounded-xl bg-slate-100" />;
    }

    const mapStyles: google.maps.MapTypeStyle[] = [
        { elementType: "geometry", stylers: [{ color: "#f8fafc" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#ffffff" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
        { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eef2f7" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#e2e8f0" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b82f6" }] },
    ];

    const markerPosition = { lat: 28.6139, lng: 77.209 };

    return (
        <div className="relative h-full w-full bg-slate-50">
            <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                zoom={5}
                center={{ lat: 20.5937, lng: 78.9629 }}
                options={{
                    styles: mapStyles,
                    disableDefaultUI: true,
                    zoomControl: true,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                }}
            >
                <Marker position={markerPosition} onClick={() => setShowInfo(true)} />
                {showInfo && (
                    <InfoWindow position={markerPosition} onCloseClick={() => setShowInfo(false)}>
                        <div className="text-slate-900 text-sm font-semibold">
                            <p className="font-black text-slate-900">KA-01-AB-1234</p>
                            <p className="text-xs text-slate-600">Location: New Delhi</p>
                            <p className="text-xs text-slate-600">Speed: 38 km/h</p>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
