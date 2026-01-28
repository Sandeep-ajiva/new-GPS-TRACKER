"use client";

import { useEffect, useMemo, useRef } from "react";
import { GoogleMap, Marker, InfoWindow, useLoadScript } from "@react-google-maps/api";

type MapPoint = {
  id: string;
  name: string;
  position: { lat: number; lng: number };
};

type VehiclePoint = {
  id: string;
  label?: string;
  status: "running" | "idle" | "stopped";
  position: { lat: number; lng: number };
  driverName?: string;
  speed?: number;
  lastUpdated?: string;
  location?: string;
};

type OrganizationMapProps = {
  organizations: MapPoint[];
  secondaryOrganizations?: MapPoint[];
  vehicles: VehiclePoint[];
  selectedOrgId?: string | null;
  selectedVehicleId?: string | null;
  onOrgSelect?: (orgId: string) => void;
  onVehicleSelect?: (vehicleId: string) => void;
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
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#e2e8f0" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#dbeafe" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b82f6" }] },
];

const createCircleIcon = (color: string, scale: number) => ({
  path: google.maps.SymbolPath.CIRCLE,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: "#e2e8f0",
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
  secondaryOrganizations = [],
  vehicles,
  selectedOrgId,
  selectedVehicleId,
  onOrgSelect,
  onVehicleSelect,
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

  const extraOrgPoints = useMemo(
    () => secondaryOrganizations.filter((org) => org.id !== selectedOrgId),
    [secondaryOrganizations, selectedOrgId]
  );

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
    const hasPoints = points.length > 0;

    points.forEach((point) => bounds.extend(point.position));
    if (selectedOrgId) {
      const orgPoint = organizations.find((org) => org.id === selectedOrgId);
      if (orgPoint) {
        bounds.extend(orgPoint.position);
      }
      extraOrgPoints.forEach((org) => bounds.extend(org.position));
    }

    if (!hasPoints && !selectedOrgId) return;
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, 80);
    }
  }, [organizations, extraOrgPoints, visibleOrgPoints, visibleVehicles, selectedOrgId]);

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

  const center = visibleOrgPoints[0]?.position || { lat: 28.6139, lng: 77.209 };
  const selectedVehicle = selectedVehicleId
    ? visibleVehicles.find((vehicle) => vehicle.id === selectedVehicleId)
    : null;
  const activeOrg = selectedOrgId
    ? organizations.find((org) => org.id === selectedOrgId)
    : null;

  return (
    <div className="relative h-full w-full bg-slate-50">
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
        {activeOrg && (
          <Marker
            key={activeOrg.id}
            position={activeOrg.position}
            label={{
              text: activeOrg.name,
              color: "#0f172a",
              fontSize: "12px",
              fontWeight: "700",
            }}
            icon={createCircleIcon("#38bdf8", 8)}
          />
        )}
        {extraOrgPoints.map((org) => (
          <Marker
            key={org.id}
            position={org.position}
            label={{
              text: org.name,
              color: "#0f172a",
              fontSize: "11px",
              fontWeight: "600",
            }}
            icon={createCircleIcon("#22d3ee", 6)}
            onClick={() => onOrgSelect?.(org.id)}
          />
        ))}
        {selectedOrgId
          ? visibleVehicles.map((vehicle) => (
              <Marker
                key={vehicle.id}
                position={vehicle.position}
                icon={createCircleIcon(statusColor(vehicle.status), selectedVehicleId ? 9 : 7)}
                onClick={() => onVehicleSelect?.(vehicle.id)}
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
        {selectedVehicle && (
          <InfoWindow
            position={selectedVehicle.position}
            onCloseClick={() => onVehicleSelect?.("")}
          >
            <div className="text-slate-900 text-sm font-semibold">
              <p className="font-black text-slate-900">{selectedVehicle.label || "Vehicle"}</p>
              <p className="text-xs text-slate-600">Driver: {selectedVehicle.driverName || "Unassigned"}</p>
              <p className="text-xs text-slate-600">Speed: {selectedVehicle.speed ?? 0} km/h</p>
              <p className="text-xs text-slate-600">Last: {selectedVehicle.lastUpdated || "Just now"}</p>
              <p className="text-xs text-slate-600">Location: {selectedVehicle.location || "Unknown"}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
