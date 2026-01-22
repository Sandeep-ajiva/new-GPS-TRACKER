"use client";

import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

type SinglePointMapProps = {
  position: { lat: number; lng: number };
  label?: string;
};

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

export default function SinglePointMap({ position, label }: SinglePointMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
  });

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

  return (
    <div className="relative h-full w-full bg-slate-950">
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
        <Marker position={position} label={label ? { text: label, color: "white" } : undefined} />
      </GoogleMap>
    </div>
  );
}
