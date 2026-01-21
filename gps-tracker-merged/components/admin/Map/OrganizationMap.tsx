"use client";

import { useEffect, useMemo, useRef } from "react";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

type MapPoint = {
  id: string;
  name: string;
  position: { lat: number; lng: number };
};

type VehiclePoint = {
  id: string;
  status: "running" | "idle" | "stopped";
  position: { lat: number; lng: number };
};

type OrganizationMapProps = {
  organizations: MapPoint[];
  vehicles: VehiclePoint[];
  selectedOrgId?: string | null;
  selectedVehicleId?: string | null;
  onOrgSelect?: (orgId: string) => void;
};

const mapStyles: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#0b1220" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#111827" }] },
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

const statusColor = (status: VehiclePoint["status"]) => {
  if (status === "running") return "#34d399";
  if (status === "idle") return "#fbbf24";
  return "#ef4444";
};

export default function OrganizationMap({
  organizations,
  vehicles,
  selectedOrgId,
  selectedVehicleId,
  onOrgSelect,
}: OrganizationMapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
  });
  const mapRef = useRef<google.maps.Map | null>(null);

  const visibleOrgPoints = useMemo(() => {
    if (selectedOrgId) {
      return organizations.filter((org) => org.id === selectedOrgId);
    }
    return organizations;
  }, [organizations, selectedOrgId]);

  const visibleVehicles = useMemo(() => {
    if (!selectedOrgId) return [];
    const scoped = vehicles.filter((vehicle) =>
      selectedOrgId ? vehicle.id.startsWith(`${selectedOrgId}:`) : true
    );
    if (selectedVehicleId) {
      return scoped.filter((vehicle) => vehicle.id === selectedVehicleId);
    }
    return scoped;
  }, [vehicles, selectedOrgId, selectedVehicleId]);

  useEffect(() => {
    if (!mapRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    const points = selectedOrgId ? visibleVehicles : visibleOrgPoints;
    if (points.length === 0) return;
    points.forEach((point) => bounds.extend(point.position));
    mapRef.current.fitBounds(bounds, 80);
  }, [visibleOrgPoints, visibleVehicles, selectedOrgId]);

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

  const center = visibleOrgPoints[0]?.position || { lat: 28.6139, lng: 77.209 };

  return (
    <div className="relative h-full w-full bg-slate-950">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        zoom={6}
        center={center}
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
        {selectedOrgId
          ? visibleVehicles.map((vehicle) => (
              <Marker
                key={vehicle.id}
                position={vehicle.position}
                icon={createCircleIcon(statusColor(vehicle.status), selectedVehicleId ? 9 : 7)}
              />
            ))
          : visibleOrgPoints.map((org) => (
              <Marker
                key={org.id}
                position={org.position}
                label={{
                  text: org.name,
                  color: "white",
                  fontSize: "12px",
                  fontWeight: "700",
                }}
                icon={createCircleIcon("#38bdf8", selectedOrgId ? 9 : 7)}
                onClick={() => onOrgSelect?.(org.id)}
              />
            ))}
      </GoogleMap>
    </div>
  );
}
