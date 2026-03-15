"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
    X, Play, Pause, SkipBack, SkipForward, Clock, Gauge,
    Navigation, MapPin, Loader2, Maximize, ZoomIn, Info, Activity,
    RotateCcw, User, Phone, Mail, FileText, Zap, Square, Moon
} from "lucide-react";
import { useGetGpsHistoryQuery } from "@/redux/api/gpsHistoryApi";
import { MapContainer, Marker, Polyline, Popup, useMap, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { Button } from "@/components/ui/button";

interface HistoryPoint {
    lat: number;
    lng: number;
    timestamp: string;
    speed: number;
    ignition: boolean;
    address: string;
    heading: number;
    odometer?: number;
}

interface TravelPlaybackInlineProps {
    vehicleId: string;
    vehicleNumber: string;
    from: string;
    to: string;
    onClose: () => void;
    metadata?: any;
}

function MapInstanceAccessor({ onMap }: { onMap: (map: L.Map) => void }) {
    const map = useMap();
    useEffect(() => {
        if (map) onMap(map);
    }, [map, onMap]);
    return null;
}

const TravelPlaybackInline: React.FC<TravelPlaybackInlineProps> = ({
    vehicleId,
    vehicleNumber,
    from,
    to,
    onClose,
    metadata
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [followVehicle, setFollowVehicle] = useState(false);
    const [selectedDay, setSelectedDay] = useState<string | null>(null);
    const [animatedPos, setAnimatedPos] = useState<{ lat: number; lng: number } | null>(null);

    const leafletMapRef = useRef<L.Map | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const lastIndexRef = useRef(0);

    const [visibleStatuses, setVisibleStatuses] = useState<Set<string>>(new Set(['stopped', 'idle']));

    const toggleStatus = (status: string) => {
        const next = new Set(visibleStatuses);
        if (next.has(status)) next.delete(status);
        else next.add(status);
        setVisibleStatuses(next);
    };

    const { data: historyResponse, isFetching, isLoading } = useGetGpsHistoryQuery(
        { vehicleId, from, to },
        { skip: !vehicleId, refetchOnMountOrArgChange: true }
    );

    const points = useMemo<HistoryPoint[]>(() => {
        const raw = historyResponse?.data?.points || [];
        return raw.map((p: any) => ({
            lat: p.latitude || p.lat,
            lng: p.longitude || p.lng,
            timestamp: p.gpsTimestamp || p.timestamp,
            speed: p.speed || 0,
            ignition: p.ignitionStatus ?? p.ignition,
            address: p.address || "",
            heading: p.heading || 0,
            odometer: p.odometer
        })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }, [historyResponse]);

    // Grouping by days
    const days = useMemo<string[]>(() => {
        if (points.length === 0) return [];
        const set = new Set(points.map((p) => new Date(p.timestamp).toLocaleDateString("en-CA")));
        return Array.from(set).sort();
    }, [points]);

    const activeDayPoints = useMemo<HistoryPoint[]>(() => {
        if (!selectedDay) return points;
        return points.filter((p) => new Date(p.timestamp).toLocaleDateString("en-CA") === selectedDay);
    }, [points, selectedDay]);

    const currentPoint = activeDayPoints[Math.min(currentIndex, activeDayPoints.length - 1)] ?? null;

    const routePositions = useMemo<[number, number][]>(
        () => activeDayPoints.map((p) => [p.lat, p.lng]),
        [activeDayPoints]
    );

    const timelineValue = useMemo(() => {
        if (activeDayPoints.length <= 1) return 0;
        return (currentIndex / (activeDayPoints.length - 1)) * 100;
    }, [currentIndex, activeDayPoints.length]);

    // Handle Animation
    useEffect(() => {
        if (activeDayPoints.length === 0) return;

        if (currentIndex === 0 || lastIndexRef.current >= activeDayPoints.length) {
            const start = activeDayPoints[0];
            setAnimatedPos({ lat: start.lat, lng: start.lng });
            lastIndexRef.current = 0;
            return;
        }

        if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        const fromPoint = activeDayPoints[lastIndexRef.current];
        const toPoint = activeDayPoints[currentIndex];
        const duration = Math.max(100, 400 / playbackSpeed);
        const startedAt = performance.now();

        const animate = (now: number) => {
            const elapsed = now - startedAt;
            const t = Math.min(elapsed / duration, 1);
            const lat = fromPoint.lat + (toPoint.lat - fromPoint.lat) * t;
            const lng = fromPoint.lng + (toPoint.lng - fromPoint.lng) * t;

            setAnimatedPos({ lat, lng });

            if (followVehicle && leafletMapRef.current) {
                leafletMapRef.current.panTo([lat, lng], { animate: true, duration: 0.1 });
            }

            if (t < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
            }
        };

        animationFrameRef.current = requestAnimationFrame(animate);
        lastIndexRef.current = currentIndex;

        return () => {
            if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [currentIndex, followVehicle, playbackSpeed, activeDayPoints]);

    // Handle Playback Interval
    useEffect(() => {
        if (!isPlaying || activeDayPoints.length <= 1) return;

        const interval = Math.max(50, 400 / playbackSpeed);
        const timer = setInterval(() => {
            setCurrentIndex((prev) => {
                const next = prev + 1;
                if (next >= activeDayPoints.length) {
                    setIsPlaying(false);
                    return prev;
                }
                return next;
            });
        }, interval);

        return () => clearInterval(timer);
    }, [isPlaying, playbackSpeed, activeDayPoints.length]);

    // Reset when day changes
    useEffect(() => {
        setIsPlaying(false);
        setCurrentIndex(0);
        lastIndexRef.current = 0;
        if (activeDayPoints.length > 0) {
            setAnimatedPos({ lat: activeDayPoints[0].lat, lng: activeDayPoints[0].lng });
            if (leafletMapRef.current) {
                const bounds = activeDayPoints.map(p => [p.lat, p.lng] as [number, number]);
                leafletMapRef.current.fitBounds(bounds, { padding: [20, 20] });
            }
        }
    }, [selectedDay, activeDayPoints]);

    const zoomToRoute = () => {
        if (!leafletMapRef.current || activeDayPoints.length === 0) return;
        leafletMapRef.current.fitBounds(routePositions, { padding: [30, 30] });
    };

    const handleTimelineChange = (val: number) => {
        const idx = Math.floor((val / 100) * (activeDayPoints.length - 1));
        setIsPlaying(false);
        setCurrentIndex(idx);
    };

    const formatSeconds = (sec: number) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Grouping consecutive points into status events
    const eventMarkers = useMemo(() => {
        if (activeDayPoints.length === 0) return [];
        const markers: any[] = [];
        let currentType: string | null = null;
        let group: any = null;

        activeDayPoints.forEach((p, idx) => {
            let type = 'stopped';
            if (p.speed > 2) type = 'running';
            else if (p.ignition) type = 'idle';

            // Detect Inactive/Gap
            if (idx > 0) {
                const prev = activeDayPoints[idx - 1];
                const gap = (new Date(p.timestamp).getTime() - new Date(prev.timestamp).getTime()) / 1000;
                if (gap > 600) { // 10 minute gap
                    markers.push({
                        type: 'inactive',
                        lat: prev.lat,
                        lng: prev.lng,
                        start: prev.timestamp,
                        end: p.timestamp,
                        duration: gap
                    });
                }
            }

            if (type !== currentType) {
                if (group && (group.type === 'stopped' || group.type === 'idle')) {
                    markers.push(group);
                }
                currentType = type;
                group = {
                    type,
                    lat: p.lat,
                    lng: p.lng,
                    start: p.timestamp,
                    end: p.timestamp,
                    points: [p]
                };
            } else if (group) {
                group.end = p.timestamp;
                group.points.push(p);
            }
        });
        if (group && (group.type === 'stopped' || group.type === 'idle')) {
            markers.push(group);
        }
        return markers;
    }, [activeDayPoints]);

    // Calculate Summary Stats from points
    const stats = useMemo(() => {
        if (activeDayPoints.length < 2) return { dist: 0, driving: 0, idle: 0, stop: 0, avg: 0 };
        let dist = 0;
        let driving = 0;
        let idle = 0;
        let stop = 0;

        for (let i = 1; i < activeDayPoints.length; i++) {
            const p1 = activeDayPoints[i - 1];
            const p2 = activeDayPoints[i];
            const dt = (new Date(p2.timestamp).getTime() - new Date(p1.timestamp).getTime()) / 1000;

            // Basic distance calculation with jump threshold to match backend
            const r = 6371;
            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
            const dLon = (p2.lng - p1.lng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const delta = r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            if (delta > 0 && delta < 5) { // 5km jump threshold
                dist += delta;
            }

            if (p2.speed > 2) driving += dt;
            else if (p2.speed <= 2 && p2.ignition) idle += dt;
            else stop += dt;
        }

        const avg = activeDayPoints.reduce((acc, p) => acc + (p.speed || 0), 0) / activeDayPoints.length;
        return { dist, driving, idle, stop, avg };
    }, [activeDayPoints]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center bg-white">
                <Loader2 className="animate-spin text-blue-600" />
                <span className="ml-2 text-sm font-semibold text-gray-500">Loading history...</span>
            </div>
        );
    }

    if (points.length === 0 && !isFetching) {
        return (
            <div className="flex h-48 flex-col items-center justify-center bg-gray-50 p-6">
                <MapPin size={32} className="mb-2 text-gray-300" />
                <p className="text-sm font-bold text-gray-900">No History Found</p>
                <p className="text-xs text-gray-500 text-center max-w-xs mt-1">
                    Wait for some time or check if device is transmitting data correctly for the selected period.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white border-y border-gray-200 shadow-inner">
            <div className="flex flex-col xl:flex-row min-h-[500px]">
                {/* Left Side: Map and Controls */}
                <div className="flex-1 border-r border-gray-100 flex flex-col min-w-0">

                    {/* Controls Bar */}
                    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-gray-50/50 border-b border-gray-100">
                        <div className="flex items-center gap-1.5 p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <button onClick={() => { setIsPlaying(false); setCurrentIndex(0); }} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                                <SkipBack size={16} />
                            </button>
                            <button
                                onClick={() => setIsPlaying(!isPlaying)}
                                className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-sm hover:bg-blue-700 transition-all"
                            >
                                {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                            </button>
                            <button onClick={() => setCurrentIndex(0)} title="Reset" className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                                <RotateCcw size={16} />
                            </button>
                            <button onClick={() => setCurrentIndex(activeDayPoints.length - 1)} className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors">
                                <SkipForward size={16} />
                            </button>
                        </div>

                        <select
                            className="h-9 px-3 text-xs font-bold bg-white border border-gray-200 rounded-lg shadow-sm outline-none"
                            value={playbackSpeed}
                            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                        >
                            <option value={1}>1x</option>
                            <option value={2}>2x</option>
                            <option value={5}>5x</option>
                            <option value={10}>10x</option>
                        </select>

                        <Button
                            variant={followVehicle ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFollowVehicle(!followVehicle)}
                            className="h-9 gap-2 text-xs font-bold"
                        >
                            <Navigation size={14} className={followVehicle ? "fill-white" : ""} />
                            Follow
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={zoomToRoute}
                            className="h-9 gap-2 text-xs font-bold"
                        >
                            <ZoomIn size={14} />
                            Zoom to route
                        </Button>

                        {/* Date Tabs */}
                        {days.length > 1 && (
                            <div className="flex items-center gap-1.5 ml-auto overflow-x-auto scrollbar-none py-1">
                                <button
                                    onClick={() => setSelectedDay(null)}
                                    className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${!selectedDay ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                >
                                    All days
                                </button>
                                {days.map(day => (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDay(day)}
                                        className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all whitespace-nowrap ${selectedDay === day ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                                    >
                                        {new Date(day + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Timeline Slider */}
                    <div className="px-6 py-4 border-b border-gray-100">
                        <input
                            type="range"
                            min={0}
                            max={100}
                            value={timelineValue}
                            onChange={(e) => handleTimelineChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="mt-2 flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <span>{currentPoint ? new Date(currentPoint.timestamp).toLocaleString() : "No timestamp"}</span>
                            <span>Point {currentIndex + 1} of {activeDayPoints.length}</span>
                        </div>
                    </div>

                    {/* Map Area */}
                    <div className="flex-1 relative bg-gray-100 h-[400px]">
                        <MapContainer
                            center={routePositions[0] || [20.5, 78.9]}
                            zoom={12}
                            className="h-full w-full z-0"
                            scrollWheelZoom={true}
                        >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <MapInstanceAccessor onMap={(map) => { leafletMapRef.current = map; }} />

                            {routePositions.length > 1 && (
                                <Polyline
                                    positions={routePositions}
                                    pathOptions={{ color: "#2563eb", weight: 4, opacity: 0.8 }}
                                />
                            )}

                            {(animatedPos || currentPoint) && (
                                <Marker
                                    position={[animatedPos?.lat ?? currentPoint.lat, animatedPos?.lng ?? currentPoint.lng]}
                                    icon={L.divIcon({
                                        className: "animated-vehicle-marker",
                                        html: `<div class="vehicle-icon-wrapper" style="transform: rotate(${(currentPoint?.heading || 0)}deg)">
                                            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M5 12h14M12 5l7 7-7 7"/>
                                            </svg>
                                        </div>`,
                                        iconSize: [32, 32],
                                        iconAnchor: [16, 16]
                                    })}
                                >
                                    <Popup>
                                        <div className="text-[10px] font-bold min-w-[120px]">
                                            <p className="border-b border-gray-100 mb-1.5 pb-1.5 text-gray-400 uppercase tracking-widest">Live Telemetry</p>
                                            <div className="space-y-1">
                                                <p className="flex justify-between items-center">
                                                    <span className="text-gray-400 font-medium">Time</span>
                                                    <span>{new Date(currentPoint.timestamp).toLocaleTimeString()}</span>
                                                </p>
                                                <p className="flex justify-between items-center text-blue-600">
                                                    <span className="font-medium">Speed</span>
                                                    <span>{currentPoint.speed.toFixed(1)} km/h</span>
                                                </p>
                                                <p className="flex justify-between items-center">
                                                    <span className="text-gray-400 font-medium">Ignition</span>
                                                    <span className={currentPoint.ignition ? 'text-green-600' : 'text-red-500'}>
                                                        {currentPoint.ignition ? 'ON' : 'OFF'}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            )}

                            {/* Event Markers (Stops, Idles, Inactive) */}
                            {eventMarkers.map((marker, idx) => {
                                if (!visibleStatuses.has(marker.type)) return null;
                                let color = "#ef4444"; // stopped
                                let iconStr = "S";
                                if (marker.type === 'idle') { color = "#f97316"; iconStr = "I"; }
                                if (marker.type === 'inactive') { color = "#64748b"; iconStr = "?"; }

                                return (
                                    <Marker
                                        key={`event-${idx}`}
                                        position={[marker.lat, marker.lng]}
                                        icon={L.divIcon({
                                            className: `status-event-marker ${marker.type}`,
                                            html: `<div style="background: ${color}; width: 22px; height: 22px; border: 2px solid white; border-radius: 50%; display: flex; items-center; justify-content: center; color: white; font-size: 10px; font-weight: 900; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">${iconStr}</div>`,
                                            iconSize: [22, 22],
                                            iconAnchor: [11, 11]
                                        })}
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[160px]">
                                                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-2" style={{ color }}>
                                                    {marker.type === 'inactive' ? 'Connection Gap' : (marker.type === 'idle' ? 'Idle Time' : 'Vehicle Stop')}
                                                </h4>
                                                <div className="space-y-1.5">
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-gray-400">Arrived</span>
                                                        <span className="font-bold">{new Date(marker.start).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="flex justify-between text-[10px]">
                                                        <span className="text-gray-400">Departed</span>
                                                        <span className="font-bold">{new Date(marker.end).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="pt-1.5 mt-1.5 border-t border-gray-100 flex justify-between text-[10px]">
                                                        <span className="text-gray-400">Duration</span>
                                                        <span className="font-black text-gray-900">
                                                            {formatSeconds(Math.max(0, (new Date(marker.end).getTime() - new Date(marker.start).getTime()) / 1000))}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}
                        </MapContainer>

                        {/* Status Filter Buttons Overlay */}
                        <div className="absolute top-20 left-3 z-[400] flex flex-col gap-2">
                            <button
                                onClick={() => toggleStatus('running')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition-all duration-300 backdrop-blur-md ${visibleStatuses.has('running') ? 'bg-green-600/90 border-green-500 text-white scale-110' : 'bg-white/80 border-gray-200 text-gray-400 hover:text-gray-600'
                                    }`}
                                title="Running"
                            >
                                <Zap size={16} className={visibleStatuses.has('running') ? 'animate-pulse' : ''} />
                            </button>
                            <button
                                onClick={() => toggleStatus('idle')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition-all duration-300 backdrop-blur-md ${visibleStatuses.has('idle') ? 'bg-orange-500/90 border-orange-400 text-white scale-110' : 'bg-white/80 border-gray-200 text-gray-400 hover:text-gray-600'
                                    }`}
                                title="Idle"
                            >
                                <Clock size={16} />
                            </button>
                            <button
                                onClick={() => toggleStatus('stopped')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition-all duration-300 backdrop-blur-md ${visibleStatuses.has('stopped') ? 'bg-red-600/90 border-red-500 text-white scale-110' : 'bg-white/80 border-gray-200 text-gray-400 hover:text-gray-600'
                                    }`}
                                title="Stopped"
                            >
                                <Square size={14} />
                            </button>
                            <button
                                onClick={() => toggleStatus('inactive')}
                                className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg border transition-all duration-300 backdrop-blur-md ${visibleStatuses.has('inactive') ? 'bg-slate-700/90 border-slate-600 text-white scale-110' : 'bg-white/80 border-gray-200 text-gray-400 hover:text-gray-600'
                                    }`}
                                title="Inactive"
                            >
                                <Moon size={16} />
                            </button>
                        </div>
                    </div>

                </div>

                {/* Right Side: Sidebar Info */}
                <div className="w-full xl:w-[340px] bg-white flex flex-col">

                    {/* Vehicle Overview */}
                    <div className="p-6 border-b border-gray-100">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Vehicle Overview</h3>
                            <span className="px-2 py-0.5 text-[9px] font-black uppercase bg-blue-50 text-blue-600 rounded">ACTIVE</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-lg font-black text-gray-900">{vehicleNumber}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{metadata?.model || "Standard Fleet"}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Type</p>
                                    <p className="text-xs font-bold text-gray-700">{metadata?.vehicleType || "Commercial"}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">IMEI</p>
                                    <p className="text-xs font-bold text-gray-700 truncate">{metadata?.imei || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Make</p>
                                    <p className="text-xs font-bold text-gray-700">{metadata?.brand || "Generic"}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider">Organization</p>
                                    <p className="text-xs font-bold text-gray-700">{metadata?.organization || "Fleet"}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Playback Snapshot */}
                    <div className="p-6 bg-gray-50/30 flex-1">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-4">Playback Snapshot</h3>
                        <div className="space-y-3">
                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Clock size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Time</p>
                                        <p className="text-xs font-bold text-gray-800 mt-1">{currentPoint ? new Date(currentPoint.timestamp).toLocaleTimeString() : "--:--:--"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Gauge size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Speed</p>
                                        <p className="text-xs font-bold text-gray-800 mt-1">{currentPoint?.speed.toFixed(1) || "0.0"} km/h</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Navigation size={16} />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Driver</p>
                                        <p className="text-xs font-bold text-gray-800 mt-1">{metadata?.driverName || "Standard Driver"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                                    <MapPin size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Location</p>
                                    <p className="text-xs font-semibold text-gray-600 mt-1 line-clamp-2">{currentPoint?.address || "Unknown location"}</p>
                                </div>
                            </div>
                        </div>

                        {/* Summary Block */}
                        <div className="mt-6 grid grid-cols-2 gap-2">
                            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-md shadow-blue-200">
                                <p className="text-[8px] font-black uppercase tracking-wider opacity-60">Total Distance</p>
                                <p className="text-base font-black">{(stats.dist || metadata?.totalDistance || 0).toFixed(1)} <span className="text-[9px] opacity-60">KM</span></p>
                            </div>
                            <div className="p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                                <p className="text-[8px] font-black uppercase tracking-wider text-gray-400">Avg Speed</p>
                                <p className="text-base font-black text-gray-800">{(stats.avg || metadata?.avgSpeed || 0).toFixed(0)} <span className="text-[9px] text-gray-400">KM/H</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .leaflet-container {
                    background: #f8fafc !important;
                }
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    background: #2563eb;
                    border: 2px solid white;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                }

                .animated-vehicle-marker {
                    background: none !important;
                    border: none !important;
                }
                .vehicle-icon-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    filter: drop-shadow(0 0 8px rgba(37, 99, 235, 0.4));
                    background: white;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    border: 2px solid #2563eb;
                }
            `}</style>
        </div>
    );
};

export default TravelPlaybackInline;
