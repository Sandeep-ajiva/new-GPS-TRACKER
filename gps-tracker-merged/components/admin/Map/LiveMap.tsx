"use client";

import { GoogleMap, InfoWindow, Marker, useLoadScript } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";

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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey || "",
    });
    const mapRef = useRef<google.maps.Map | null>(null);
    const [activeVehicleId, setActiveVehicleId] = useState<string | null>(null);

    const vehiclePoints = useMemo(
        () =>
            vehicles.filter((vehicle) =>
                Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lng)
            ),
        [vehicles]
    );

    useEffect(() => {
        if (!mapRef.current || vehiclePoints.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        vehiclePoints.forEach((vehicle) => bounds.extend({ lat: vehicle.lat, lng: vehicle.lng }));
        if (!bounds.isEmpty()) {
            mapRef.current.fitBounds(bounds, 80);
        }
    }, [vehiclePoints]);

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

    const createCircleIcon = (color: string, scale: number) => ({
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: "#0f172a",
        strokeOpacity: 0.9,
        strokeWeight: 2,
        scale,
    });

    const getStatusColor = (speed: number) => (speed > 0 ? "#34d399" : "#f59e0b");
    const activeVehicle = activeVehicleId
        ? vehiclePoints.find((vehicle) => vehicle.id === activeVehicleId)
        : null;

    return (
        <div className="relative h-full w-full bg-slate-950">
            <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                zoom={5}
                center={{ lat: 20.5937, lng: 78.9629 }}
                onLoad={(map) => {
                    mapRef.current = map;
                }}
                onClick={() => setActiveVehicleId(null)}
                options={{
                    styles: mapStyles,
                    disableDefaultUI: true,
                    zoomControl: true,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                }}
            >
                {vehiclePoints.map((vehicle) => (
                    <Marker
                        key={vehicle.id}
                        position={{ lat: vehicle.lat, lng: vehicle.lng }}
                        icon={createCircleIcon(getStatusColor(vehicle.speed), vehicle.id === activeVehicleId ? 9 : 7)}
                        onClick={() => setActiveVehicleId(vehicle.id)}
                    />
                ))}
                {activeVehicle && (
                    <InfoWindow
                        position={{ lat: activeVehicle.lat, lng: activeVehicle.lng }}
                        onCloseClick={() => setActiveVehicleId(null)}
                    >
                        <div className="text-slate-900 text-sm font-semibold">
                            <p className="font-black text-slate-900">{activeVehicle.vehicleNumber}</p>
                            <p className="text-xs text-slate-600">Speed: {activeVehicle.speed} km/h</p>
                            <p className="text-xs text-slate-600">
                                Last Updated: {new Date(activeVehicle.lastUpdated).toLocaleTimeString()}
                            </p>
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
        </div>
    );
}
