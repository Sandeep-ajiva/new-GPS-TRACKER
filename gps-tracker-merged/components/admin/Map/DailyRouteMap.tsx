"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, useMap } from "react-leaflet";
import { DivIcon, latLng, latLngBounds, Map as LeafletMap } from "leaflet";
import { Play, Pause, RotateCcw, Map as MapIcon, Crosshair } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import MapTileLayer from "./MapTileLayer";

type Point = {
  lat: number;
  lng: number;
  timestamp: string;
  speed: number;
  ignition: boolean;
  heading?: number;
  alertType?: string;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const lerpHeading = (from: number, to: number, t: number) => {
  let delta = to - from;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return from + delta * t;
};

const haversineKm = (a: Point, b: Point) => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
};

const makeIcon = (color: string) =>
  new DivIcon({
    html: `<div style="width:16px;height:16px;background:${color};border:2px solid #0f172a;border-radius:9999px;box-shadow:0 0 10px ${color}80;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const carIcon = (heading: number) =>
  new DivIcon({
    html: `<div style="width:30px;height:18px;border-radius:6px;background:#0ea5e9;border:2px solid #0b2540;display:flex;align-items:center;justify-content:center;color:white;font-size:13px;transform:rotate(${heading}deg);box-shadow:0 4px 10px rgba(0,0,0,0.35);">🚗</div>`,
    iconSize: [30, 18],
    iconAnchor: [15, 9],
  });

const computeSmartZoom = (pts: Point[]) => {
  if (pts.length < 2) return 15;
  let dist = 0;
  for (let i = 1; i < pts.length; i++) dist += haversineKm(pts[i - 1], pts[i]);
  if (dist > 80) return 11;
  if (dist > 30) return 12;
  if (dist > 10) return 13;
  if (dist > 3) return 14;
  return 15;
};

function FitBounds({ pts }: { pts: Point[] }) {
  const map = useMap();
  useEffect(() => {
    if (!pts.length) return;
    map.fitBounds(latLngBounds(pts.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
  }, [map, pts]);
  return null;
}

export default function DailyRouteMap({ points, satellite = true }: { points: Point[]; satellite?: boolean }) {
  const path = useMemo(() => {
    const filtered = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
    return filtered.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [points]);
  const [map, setMap] = useState<LeafletMap | null>(null);
  const [mapTheme, setMapTheme] = useState<"satellite" | "street">(satellite ? "satellite" : "street");
  const [playheadIdx, setPlayheadIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [stopFilter, setStopFilter] = useState<"all" | "normal" | "idle" | "hide">("all");
  const [renderPoint, setRenderPoint] = useState<Point | null>(path[0] || null);
  const [isStopMenuOpen, setIsStopMenuOpen] = useState(false);
  const holdUntilRef = useRef<number>(0);
  const animRef = useRef<number>();
  const baseZoom = useMemo(() => computeSmartZoom(path), [path]);

  useEffect(() => setMapTheme(satellite ? "satellite" : "street"), [satellite]);

  useEffect(() => {
    setPlayheadIdx(0);
    setIsPlaying(false);
    setRenderPoint(path[0] || null);
    holdUntilRef.current = 0;
  }, [path.length]);

  useEffect(() => {
    if (!isPlaying || path.length < 2) return;
    let localIdx = playheadIdx;
    let progress = 0;
    let last = performance.now();
    const stepMs = 900;

    const loop = (now: number) => {
      if (!isPlaying) return;
      if (now < holdUntilRef.current) {
        animRef.current = requestAnimationFrame(loop);
        return;
      }
      const dt = now - last;
      last = now;
      progress += (dt * playSpeed) / stepMs;

      const current = path[localIdx];
      const next = path[Math.min(localIdx + 1, path.length - 1)];
      const t = Math.min(progress, 1);
      const heading = lerpHeading(current.heading ?? 0, next.heading ?? current.heading ?? 0, t);
      setRenderPoint({
        ...current,
        lat: lerp(current.lat, next.lat, t),
        lng: lerp(current.lng, next.lng, t),
        heading,
        speed: lerp(current.speed, next.speed, t),
      });

      if (progress >= 1 && localIdx < path.length - 1) {
        progress = 0;
        localIdx += 1;
        if (path[localIdx].speed === 0 && path[Math.max(localIdx - 1, 0)].speed > 0) {
          holdUntilRef.current = now + 900; // brief pause at stops
        }
        setPlayheadIdx(localIdx);
      }
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, playSpeed, path, playheadIdx]);

  const activePoint = path[Math.min(playheadIdx, Math.max(path.length - 1, 0))];
  const start = path[0];
  const end = path[path.length - 1];

  useEffect(() => {
    if (!map || !start) return;
    map.setView([start.lat, start.lng], baseZoom);
    const bounds = latLngBounds(path.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: baseZoom });
  }, [map, start, path, baseZoom]);

  const centerOnActive = useCallback(
    (opts?: { forceZoom?: boolean; point?: { lat: number; lng: number } }) => {
      const targetPoint = opts?.point || activePoint;
      if (!map || !targetPoint) return false;
      const target = latLng(targetPoint.lat, targetPoint.lng);
      const center = map.getCenter();
      const distance = center.distanceTo(target); // meters
      const currentZoom = map.getZoom();
      const desiredZoom = opts?.forceZoom ? Math.max(currentZoom, baseZoom) : Math.max(currentZoom, baseZoom - 1);

      if (distance > 40 || opts?.forceZoom) {
        map.flyTo(target, desiredZoom, { duration: 0.35 });
        return true;
      }
      return false;
    },
    [map, activePoint, baseZoom]
  );

  // Keep the vehicle centered while playing using interpolated position.
  useEffect(() => {
    if (!isPlaying || !renderPoint) return;
    centerOnActive({ point: renderPoint });
  }, [renderPoint, isPlaying, centerOnActive]);

  // Also recenter whenever playhead jumps (e.g., after restart) to keep start in view.
  useEffect(() => {
    if (!isPlaying && playheadIdx === 0) centerOnActive({ forceZoom: true, point: path[0] });
  }, [playheadIdx, isPlaying, centerOnActive, path]);

  const stops = useMemo(() => {
    const result: { lat: number; lng: number; start: string; end: string; duration: number; ignition: boolean; type: "idle" | "stop" }[] = [];
    let streak: Point[] = [];
    path.forEach((p) => {
      if (p.speed === 0) streak.push(p);
      else {
        if (streak.length > 2) {
          const s = streak[0];
          const e = streak[streak.length - 1];
          result.push({
            lat: streak[Math.floor(streak.length / 2)].lat,
            lng: streak[Math.floor(streak.length / 2)].lng,
            start: s.timestamp,
            end: e.timestamp,
            duration: (new Date(e.timestamp).getTime() - new Date(s.timestamp).getTime()) / 1000,
            ignition: streak.some((pt) => pt.ignition),
            type: streak.some((pt) => pt.ignition) ? "idle" : "stop",
          });
        }
        streak = [];
      }
    });
    if (streak.length > 2) {
      const s = streak[0];
      const e = streak[streak.length - 1];
      result.push({
        lat: streak[Math.floor(streak.length / 2)].lat,
        lng: streak[Math.floor(streak.length / 2)].lng,
        start: s.timestamp,
        end: e.timestamp,
        duration: (new Date(e.timestamp).getTime() - new Date(s.timestamp).getTime()) / 1000,
        ignition: streak.some((pt) => pt.ignition),
        type: streak.some((pt) => pt.ignition) ? "idle" : "stop",
      });
    }
    return result;
  }, [path]);

  const turnsAndBrakes = useMemo(() => {
    const ev: any[] = [];
    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const cur = path[i];
      if (prev.heading != null && cur.heading != null) {
        let delta = cur.heading - prev.heading;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        const abs = Math.abs(delta);
        if (abs >= 15) {
          const subtype =
            abs > 60 ? (delta > 0 ? "sharp-right" : "sharp-left") : delta > 0 ? "slight-right" : "slight-left";
          ev.push({ type: "turn", subtype, ...cur });
        }
      }
      if (prev.speed - cur.speed > 30) {
        ev.push({ type: "harsh-brake", ...cur });
      }
    }
    return ev;
  }, [path]);

  const visibleStops = useMemo(() => {
    if (stopFilter === "hide") return [];
    if (stopFilter === "normal") return stops.filter((s) => s.type === "stop");
    if (stopFilter === "idle") return stops.filter((s) => s.type === "idle");
    return stops;
  }, [stops, stopFilter]);

  if (!path.length) {
    return <div className="h-[500px] rounded-2xl border border-white/10 bg-slate-900/60 text-slate-400 flex items-center justify-center">No route data</div>;
  }

  return (
    <div className="h-[500px] rounded-2xl border border-white/10 bg-slate-900/70 shadow-lg shadow-black/25 overflow-hidden relative">
      <MapContainer
        center={[path[0].lat, path[0].lng]}
        zoom={14}
        className="h-full w-full"
        attributionControl={false}
        whenCreated={setMap}
      >
        <MapTileLayer satellite={mapTheme === "satellite"} />
        <FitBounds pts={path} />
        <Polyline positions={path.map((p) => [p.lat, p.lng])} color="#0ea5e9" weight={5} opacity={0.85} />

        {start && (
          <Marker position={[start.lat, start.lng]} icon={makeIcon("#22c55e")}>
            <Popup className="text-xs">
              <div>Start</div>
              <div>{new Date(start.timestamp).toLocaleString()}</div>
            </Popup>
          </Marker>
        )}
        {end && (
          <Marker position={[end.lat, end.lng]} icon={makeIcon("#ef4444")}>
            <Popup className="text-xs">
              <div>End</div>
              <div>{new Date(end.timestamp).toLocaleString()}</div>
            </Popup>
          </Marker>
        )}

        {stopFilter !== "hide" &&
          visibleStops.map((s, idx) => (
            <Marker
              key={`stop-${idx}`}
              position={[s.lat, s.lng]}
              icon={makeIcon(s.type === "idle" ? "#fbbf24" : "#ef4444")}
              eventHandlers={{
                click: (e) => {
                  map?.flyTo([s.lat, s.lng], Math.max(baseZoom, 16), { duration: 0.4 });
                  (e.target as any)?.openPopup?.();
                },
              }}
            >
              <Popup className="text-xs space-y-1">
                <div className="font-semibold">{s.type === "idle" ? "Idle Stop" : "Stop"}</div>
                <div>From: {new Date(s.start).toLocaleTimeString()}</div>
                <div>To: {new Date(s.end).toLocaleTimeString()}</div>
                <div>Duration: {Math.round(s.duration)}s</div>
                <div>Ignition: {s.ignition ? "ON" : "OFF"}</div>
              </Popup>
            </Marker>
          ))}

        {turnsAndBrakes.map((ev, idx) => (
          <Marker key={`turn-${idx}`} position={[ev.lat, ev.lng]} icon={makeIcon(ev.type === "harsh-brake" ? "#ef4444" : ev.subtype?.includes("right") ? "#22c55e" : "#f97316")}>
            <Popup className="text-xs space-y-1">
              <div>{ev.type === "harsh-brake" ? "Harsh Brake" : ev.subtype?.replace("-", " ")}</div>
              <div>{new Date(ev.timestamp).toLocaleString()}</div>
              <div>Speed: {ev.speed.toFixed(1)} km/h</div>
              <div>Ignition: {ev.ignition ? "ON" : "OFF"}</div>
              {ev.heading != null && <div>Heading: {ev.heading.toFixed(0)}°</div>}
            </Popup>
          </Marker>
        ))}

        {/* Live car marker using interpolated position */}
        {renderPoint && (
          <Marker
            position={[renderPoint.lat, renderPoint.lng]}
            icon={carIcon(renderPoint.heading || 0)}
          />
        )}
      </MapContainer>

      {/* Right rail */}
      <div className="pointer-events-none absolute right-3 top-3 z-[5000] flex flex-col gap-2">
        <button
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/85 text-white shadow-lg border border-white/10"
          title="Toggle map layer"
          onClick={() => setMapTheme((m) => (m === "satellite" ? "street" : "satellite"))}
        >
          <MapIcon size={18} />
        </button>
        <button
          className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-900/85 text-white shadow-lg border border-white/10"
          title="Re-center on vehicle"
          onClick={() => {
            if (renderPoint) {
              centerOnActive({ forceZoom: true, point: renderPoint });
            } else if (activePoint) {
              centerOnActive({ forceZoom: true, point: activePoint });
            } else if (map && path.length) {
              map.fitBounds(latLngBounds(path.map((p) => [p.lat, p.lng])), { padding: [40, 40] });
            }
          }}
        >
          <Crosshair size={18} />
        </button>
        <div className="pointer-events-auto relative">
          <button
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full font-bold shadow-lg border ${stopFilter === "hide" ? "bg-slate-900/85 text-white border-white/10" : "bg-emerald-500 text-emerald-950 border-emerald-300/60"}`}
            title="Stop / Idle markers"
            onClick={() => setIsStopMenuOpen((o) => !o)}
          >
            S
          </button>
          {isStopMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 rounded-lg border border-white/10 bg-slate-900/95 text-white shadow-xl z-[6000]">
              {[
                { key: "all", label: "All Stops" },
                { key: "normal", label: "Normal Stops" },
                { key: "idle", label: "Idle Stops" },
                { key: "hide", label: "Hide Stops" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-800 ${stopFilter === opt.key ? "text-emerald-400" : "text-white"}`}
                  onClick={() => {
                    setStopFilter(opt.key as any);
                    setIsStopMenuOpen(false);
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Play controls + live HUD */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[5000] flex justify-center">
        <div className="pointer-events-auto inline-flex items-center gap-4 rounded-full bg-slate-900/90 px-5 py-3 text-white shadow-2xl border border-white/10 backdrop-blur">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="rounded-full bg-slate-800 px-3 py-1 text-emerald-200">
              {renderPoint ? `${renderPoint.speed.toFixed(1)} km/h` : "-- km/h"}
            </span>
            <span className="text-xs text-slate-300">
              {renderPoint ? new Date(renderPoint.timestamp).toLocaleTimeString() : "--"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-emerald-950 shadow-lg"
              onClick={() => {
                setIsPlaying((p) => {
                  const next = !p;
                  if (!p && activePoint) centerOnActive({ forceZoom: true });
                  return next;
                });
              }}
              aria-label={isPlaying ? "Pause playback" : "Play playback"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-800 hover:bg-slate-700"
              onClick={() => { setPlayheadIdx(0); setIsPlaying(false); centerOnActive({ forceZoom: true }); }}
              aria-label="Restart"
            >
              <RotateCcw size={18} />
            </button>
            <div className="flex items-center gap-1 text-xs text-slate-200">
              <span className="uppercase tracking-wide text-[10px] text-slate-400">Playback</span>
              {[1, 2, 4].map((s) => (
                <button
                  key={s}
                  onClick={() => setPlaySpeed(s)}
                  className={`px-2 py-1 rounded-full border text-xs ${playSpeed === s ? "bg-emerald-500 text-emerald-950 border-emerald-400" : "bg-slate-800 border-white/10 text-white"}`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
