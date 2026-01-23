"use client";

import { GoogleMap, Marker, Polyline, useLoadScript } from "@react-google-maps/api";
import { useEffect, useMemo, useRef } from "react";

interface HistoryMapProps {
    pathData: any[];
}

export default function HistoryMap({ pathData }: HistoryMapProps) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey || "",
    });
    const mapRef = useRef<google.maps.Map | null>(null);

    const pathPoints = useMemo(
        () =>
            pathData
                .map((p) => ({ lat: p.latitude ?? p.lat, lng: p.longitude ?? p.lng }))
                .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
        [pathData]
    );

    useEffect(() => {
        if (!mapRef.current || pathPoints.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        pathPoints.forEach((point) => bounds.extend(point));
        if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, 80);
        }
    }, [pathPoints]);

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
        return (
            <div className="flex h-full w-full items-center justify-center bg-slate-950 text-slate-300">
                Loading Google Maps...
            </div>
        );
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

    const startPoint = pathPoints[0];
    const endPoint = pathPoints[pathPoints.length - 1];

    return (
        <div className="relative h-full w-full bg-slate-950">
            <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                zoom={12}
                center={startPoint || { lat: 20.5937, lng: 78.9629 }}
                onLoad={(map) => {
                    mapRef.current = map;
                }}
                options={{
                    styles: mapStyles,
                    disableDefaultUI: true,
                    zoomControl: true,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                }}
            >
                {pathPoints.length > 0 && (
                    <Polyline
                        path={pathPoints}
                        options={{ strokeColor: "#38bdf8", strokeOpacity: 0.9, strokeWeight: 3 }}
                    />
                )}
                {startPoint && (
                    <Marker
                        position={startPoint}
                        label={{ text: "Start", color: "white", fontSize: "12px", fontWeight: "700" }}
                    />
                )}
                {endPoint && (
                    <Marker
                        position={endPoint}
                        label={{ text: "End", color: "white", fontSize: "12px", fontWeight: "700" }}
                    />
                )}
            </GoogleMap>
        </div>
    );
}
