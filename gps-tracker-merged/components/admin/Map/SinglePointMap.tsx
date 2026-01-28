"use client";

import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

type SinglePointMapProps = {
  position: { lat: number; lng: number };
  label?: string;
};

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

export default function SinglePointMap({ position, label }: SinglePointMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
  });

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
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-500">
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-slate-50">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={12}
        center={position}
        options={{
          styles: mapStyles,
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        }}
      >
        <Marker position={position} label={label ? { text: label, color: "#0f172a" } : undefined} />
      </GoogleMap>
    </div>
  );
}
