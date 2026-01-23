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
            <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
                Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to load Google Maps.
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
                Unable to load Google Maps. Check the API key and billing settings.
            </div>
        );
    }

    if (!isLoaded) {
        return <div className="h-full w-full animate-pulse rounded-xl bg-slate-900/60" />;
    }

    const mapStyles: google.maps.MapTypeStyle[] = [
        { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
        { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1d30" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#38bdf8" }] },
    ];

    const markerPosition = { lat: 28.6139, lng: 77.209 };

    return (
        <div className="relative h-full w-full bg-slate-950">
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
