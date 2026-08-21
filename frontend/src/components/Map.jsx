import { useEffect, useRef, useCallback, useState } from "react";
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchSafetySignals, fetchIncidents } from '../api/safety'
import { ReportModal } from './ReportModal'
import { Shield } from "lucide-react";

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
})

const liveLocationIcon = L.divIcon({
    className: 'live-location-icon',
    html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59, 130, 246, 0.8); animation: pulse 2s infinite;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
});

const destIcon = L.divIcon({
    className: 'custom-dest-icon bg-transparent border-none',
    html: `<div style="width: 20px; height: 20px; background-color: #ef4444; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
})

const originIcon = L.divIcon({
    className: 'custom-origin-icon bg-transparent border-none',
    html: `<div style="width: 20px; height: 20px; background-color: #10b981; border: 3px solid white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10]
});

export function Map({ routeGeometry, onSetDestination, isTracking, destination, origin, onArrived, user }) {
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const geoJsonLayerRef = useRef(null)
    const markersLayerRef = useRef(null)
    const liveMarkerRef = useRef(null)
    const destMarkerRef = useRef(null)
    const originMarkerRef = useRef(null)

    // Modal state
    const [reportLocation, setReportLocation] = useState(null)
    const [selectedMapLocation, setSelectedMapLocation] = useState(null)
    const [showFilters, setShowFilters] = useState(false)

    // Internal Filters state
    const [filters, setFilters] = useState({
        signals: { CCTV: true, LIGHT: true, POLICE: true, MEDICAL: true },
        incidents: { LIGHTING: true, HAZARD: true, INCIDENT: true, ACCIDENT: true }
    });

    const filtersRef = useRef(filters);
    useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    const handleFilterChange = (category, type) => {
        setFilters(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [type]: !prev[category][type]
            }
        }));
    };

    const loadSafetyData = useCallback(async (map) => {
        const bounds = map.getBounds();
        const params = {
            min_lat: bounds.getSouth(),
            max_lat: bounds.getNorth(),
            min_lng: bounds.getWest(),
            max_lng: bounds.getEast()
        };

        try {
            const [signals, incidents] = await Promise.all([
                fetchSafetySignals(params),
                fetchIncidents(params)
            ]);

            if (markersLayerRef.current) {
                markersLayerRef.current.clearLayers();
                const activeFilters = filtersRef.current;

                signals
                    .filter(s => activeFilters.signals[s.signal_type])
                    .forEach(signal => {
                        const marker = L.marker([signal.latitude, signal.longitude]);
                        marker.bindPopup(`<b>${signal.name}</b><br/>${signal.signal_type.replace('_', ' ')}`);
                        markersLayerRef.current.addLayer(marker);
                    });

                incidents
                    .filter(i => activeFilters.incidents[i.incident_type])
                    .forEach(incident => {
                        const marker = L.marker([incident.latitude, incident.longitude]);
                        marker.bindPopup(`<b>${incident.incident_type}</b><br/>Status: ${incident.status}`);
                        markersLayerRef.current.addLayer(marker);
                    });
            }
        } catch (err) {
            console.error("Failed to load safety data:", err);
        }
    }, []); 

    useEffect(() => {
        if (!mapContainerRef.current) return
        
        const map = L.map(mapContainerRef.current).setView([13.9414, 121.6236], 14)
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        // Initialize LayerGroup for safety markers
        markersLayerRef.current = L.layerGroup().addTo(map);

        // Fetch initial data
        loadSafetyData(map);

        // Fetch data on map move
        map.on('moveend', () => loadSafetyData(map));

        // Locate current user and drop a marker
        map.locate({ setView: false, maxZoom: 16 });
        map.on('locationfound', (e) => {
            if (map !== mapRef.current) return;
            const radius = e.accuracy / 2;
            L.marker(e.latlng).addTo(map)
                .bindPopup(`You are here! (Within ${Math.round(radius)} meters)`).openPopup();
            L.circle(e.latlng, radius).addTo(map);
        });

        // Click listener for setting destination or reporting hazard
        map.on('click', (e) => {
            setSelectedMapLocation(e.latlng)
        });

        return () => {
            if(mapRef.current) {
                mapRef.current.off('moveend');
                mapRef.current.off('click');
                mapRef.current.remove()
                mapRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (mapRef.current) {
            loadSafetyData(mapRef.current);
        }
    }, [filters, loadSafetyData]);

    useEffect(() => {
        const map = mapRef.current
        if(!map) return

        if (geoJsonLayerRef.current) {
            map.removeLayer(geoJsonLayerRef.current)
            geoJsonLayerRef.current = null
        }

        if (routeGeometry && Object.keys(routeGeometry).length > 0) {
            const geoJsonLayer = L.geoJSON(routeGeometry, {
                style: {
                    color: '#2563eb',
                    weight: 6,
                    opacity: 0.8
                }
            }).addTo(map)
            
            geoJsonLayerRef.current = geoJsonLayer    
            
            const bounds = geoJsonLayer.getBounds()
            if(bounds.isValid() && !isTracking) {
                map.fitBounds(bounds, { padding: [50, 50] })
            }
        }
    },[routeGeometry, isTracking])

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (destination && !isNaN(destination.lat) && !isNaN(destination.lng)) {
            const latlng = L.latLng(destination.lat, destination.lng);
            if (!destMarkerRef.current) {
                // Add a destination marker using our custom red icon
                destMarkerRef.current = L.marker(latlng, { icon: destIcon }).addTo(map).bindPopup("Destination");
            } else {
                destMarkerRef.current.setLatLng(latlng);
            }
        } else {
            if (destMarkerRef.current) {
                map.removeLayer(destMarkerRef.current);
                destMarkerRef.current = null;
            }
        }
    }, [destination]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (origin && !isNaN(origin.lat) && !isNaN(origin.lng)) {
            const latlng = L.latLng(origin.lat, origin.lng);
            if (!originMarkerRef.current) {
                // Add an origin marker using custom green icon
                originMarkerRef.current = L.marker(latlng, { icon: originIcon }).addTo(map).bindPopup("Origin");
            } else {
                originMarkerRef.current.setLatLng(latlng);
            }
        } else {
            if (originMarkerRef.current) {
                map.removeLayer(originMarkerRef.current);
                originMarkerRef.current = null;
            }
        }
    }, [origin]);

    useEffect(() => {
        let watchId;
        const map = mapRef.current;

        if (isTracking && map) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    const latlng = L.latLng(latitude, longitude);

                    if (!liveMarkerRef.current) {
                        liveMarkerRef.current = L.marker(latlng, { icon: liveLocationIcon, zIndexOffset: 1000 }).addTo(map);
                    } else {
                        liveMarkerRef.current.setLatLng(latlng);
                    }

                    map.panTo(latlng, { animate: true, duration: 1.0 });

                    if (destination && onArrived) {
                        const destLatLng = L.latLng(destination.lat, destination.lng);
                        const distance = map.distance(latlng, destLatLng);
                        
                        if (distance <= 20) {
                            onArrived();
                        }
                    }
                },
                (error) => {
                    console.error("Error watching position:", error);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 5000
                }
            );
        } else {
            if (liveMarkerRef.current && map) {
                map.removeLayer(liveMarkerRef.current);
                liveMarkerRef.current = null;
            }
        }

        return () => {
            if (watchId !== undefined) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, [isTracking, destination, onArrived]);

    // WebSocket for Real-Time Incidents
    useEffect(() => {
        // Use ws:// for local dev. In production with HTTPS, use wss://
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        // Assuming the backend runs on localhost:8004
        const wsUrl = `${wsProtocol}//localhost:8004/ws/incidents/`

        const socket = new WebSocket(wsUrl)

        socket.onopen = () => {
            console.log('Connected to real-time incidents channel')
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if(data.type === 'incident_update') {
                const newIncident = data.data
                console.log("New incident received!", newIncident)

                // Add the new marker to the map instantly using Leaflet
                if (markersLayerRef.current) {
                    const marker = L.marker([newIncident.latitude, newIncident.longitude])
                    marker.bindPopup(`<b>${newIncident.incident_type}</b><br/>Status: ${newIncident.status}`)
                    markersLayerRef.current.addLayer(marker)
                }
            }
        }

        socket.onclose = () => {
            console.log('Disconnected from real-time incidents channel')
        }

        return () => {
            socket.close()
        }
    }, [])

    return (
        <div className="w-full h-full relative">
            <style>
                {`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
                `}
            </style>
            <div
                ref={mapContainerRef}
                className="w-full h-full rounded-none"
            />

            {/* ONLY ADMINS SEE FILTERS */}
            {!isTracking && user?.is_staff && (
                <div className="absolute top-6 right-6 z-[1000] flex flex-col items-end gap-3">
                    {/* Toggle Button */}
                    <button 
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-3 rounded-xl shadow-lg border transition-all flex items-center gap-2 font-bold text-sm ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-background text-foreground border-border hover:bg-muted'}`}
                    >
                        <Shield className="w-4 h-4" />
                        {showFilters ? 'Hide Filters' : 'Map Filters'}
                    </button>

                    {/* Filter Panel (Only shown if showFilters is true) */}
                    {showFilters && (
                        <div className="bg-background/95 backdrop-blur-xl p-4 rounded-xl shadow-xl border border-border w-64 max-h-[70vh] overflow-y-auto animate-in fade-in slide-in-from-top-4">
                            <h4 className="mt-0 mb-3 text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
                                <Shield className="w-4 h-4 text-destructive" /> Moderator Filters
                            </h4>
                            
                            <div className="mb-4">
                                <strong className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Infrastructure</strong>
                                <div className="flex flex-col gap-2 mt-2">
                                    {Object.keys(filters.signals).map(type => (
                                        <label key={type} className="flex items-center gap-3 text-xs font-semibold text-foreground cursor-pointer hover:bg-muted p-1.5 rounded-md transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={filters.signals[type]} 
                                                onChange={() => handleFilterChange('signals', type)}
                                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary"
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <strong className="text-xs font-bold text-muted-foreground uppercase tracking-wider">User Incidents</strong>
                                <div className="flex flex-col gap-2 mt-2">
                                    {Object.keys(filters.incidents).map(type => (
                                        <label key={type} className="flex items-center gap-3 text-xs font-semibold text-foreground cursor-pointer hover:bg-muted p-1.5 rounded-md transition-colors">
                                            <input 
                                                type="checkbox" 
                                                checked={filters.incidents[type]} 
                                                onChange={() => handleFilterChange('incidents', type)}
                                                className="w-4 h-4 rounded border-input text-primary focus:ring-primary accent-primary"
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {selectedMapLocation && !reportLocation && !isTracking && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex justify-center items-center">
                    <div className="bg-background p-6 rounded-2xl w-[320px] shadow-2xl border border-border flex flex-col gap-4 transform transition-all">
                        <div>
                            <h3 className="m-0 text-lg font-bold text-foreground">Map Action</h3>
                            <p className="m-0 text-xs font-mono text-muted-foreground mt-1">
                                {selectedMapLocation.lat.toFixed(4)}, {selectedMapLocation.lng.toFixed(4)}
                            </p>
                        </div>
                        
                        <div className="flex flex-col gap-2 mt-2">
                            <button 
                                onClick={() => {
                                    if (onSetDestination) onSetDestination(selectedMapLocation);
                                    setSelectedMapLocation(null);
                                }} 
                                className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md hover:bg-primary/90 transition-colors"
                            >
                                Set as Destination
                            </button>
                            
                            <button 
                                onClick={() => {
                                    setReportLocation(selectedMapLocation);
                                    setSelectedMapLocation(null);
                                }} 
                                className="w-full py-2.5 bg-destructive text-destructive-foreground font-bold rounded-xl shadow-md hover:bg-destructive/90 transition-colors"
                            >
                                Report Hazard Here
                            </button>

                            <button 
                                onClick={() => setSelectedMapLocation(null)} 
                                className="w-full py-2.5 mt-2 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {reportLocation && (
                <ReportModal
                    lat={reportLocation.lat}
                    lng={reportLocation.lng}
                    onClose={() => setReportLocation(null)}
                    onSuccess={() => {
                        setReportLocation(null);
                        if (mapRef.current) {
                            loadSafetyData(mapRef.current);
                        }
                    }}
                />
            )}
        </div>
    )
}