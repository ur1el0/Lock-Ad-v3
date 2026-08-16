import { useEffect, useRef, useCallback, useState } from "react";
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchSafetySignals, fetchIncidents } from '../api/safety'
import { ReportModal } from './ReportModal'

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

export function Map({ routeGeometry, onSetDestination, isTracking, destination, origin, onArrived }) {
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
                // Add a destination marker
                destMarkerRef.current = L.marker(latlng).addTo(map).bindPopup("Destination");
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
                // Add an origin marker (you could customize the icon here)
                originMarkerRef.current = L.marker(latlng).addTo(map).bindPopup("Origin");
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
        // Assuming the backend runs on localhost:8001
        const wsUrl = `${wsProtocol}//localhost:8001/ws/incidents/`

        const socket = new WebSocket(wsUrl)

        socket.onopen = () => {
            console.log('Connected to real-time incidents channel')
        }

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data)
            if(data.type === 'incident_update') {
                const newIncident = data.data
                console.log("New incident received!", newIncident)

                // Add the new marker to the map instantly
                if (window.google) {
                    new window.google.maps.Marker({
                        position: { lat: parseFloat(newIncident.latitude), lng: parseFloat(newIncident.longitude) },
                        map: mapRef.current,
                        title: newIncident.incident_type,
                        icon: {
                            url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
                        }
                    })
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
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
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
                style={{ width: '100%', height: '100%', borderRadius: '12px'}}
            />

            {!isTracking && (
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    padding: '12px',
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                    zIndex: 1000,
                    width: '240px',
                    maxHeight: '80%',
                    overflowY: 'auto'
                }}>
                    <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '14px' }}>Map Filters</h4>
                    
                    <div style={{ marginBottom: '12px' }}>
                        <strong style={{ fontSize: '12px', color: '#555' }}>Infrastructure</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {Object.keys(filters.signals).map(type => (
                                <label key={type} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filters.signals[type]} 
                                        onChange={() => handleFilterChange('signals', type)}
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div>
                        <strong style={{ fontSize: '12px', color: '#555' }}>User Incidents</strong>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                            {Object.keys(filters.incidents).map(type => (
                                <label key={type} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={filters.incidents[type]} 
                                        onChange={() => handleFilterChange('incidents', type)}
                                    />
                                    {type}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedMapLocation && !reportLocation && !isTracking && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 9999,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div style={{
                        background: 'white', padding: '24px', borderRadius: '8px', 
                        width: '300px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        display: 'flex', flexDirection: 'column', gap: '12px'
                    }}>
                        <h3 style={{ marginTop: 0, marginBottom: 0 }}>Map Action</h3>
                        <p style={{ margin: 0, fontSize: '14px', color: '#555' }}>
                            {selectedMapLocation.lat.toFixed(4)}, {selectedMapLocation.lng.toFixed(4)}
                        </p>
                        
                        <button 
                            onClick={() => {
                                if (onSetDestination) onSetDestination(selectedMapLocation);
                                setSelectedMapLocation(null);
                            }} 
                            style={{ padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Set as Destination
                        </button>
                        
                        <button 
                            onClick={() => {
                                setReportLocation(selectedMapLocation);
                                setSelectedMapLocation(null);
                            }} 
                            style={{ padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Report Hazard Here
                        </button>

                        <button 
                            onClick={() => setSelectedMapLocation(null)} 
                            style={{ padding: '10px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}
                        >
                            Cancel
                        </button>
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