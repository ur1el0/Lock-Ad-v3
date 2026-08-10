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

export function Map({ routeGeometry, onSetDestination }) {
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const geoJsonLayerRef = useRef(null)
    const markersLayerRef = useRef(null)

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
            if (!mapRef.current) return; // Prevent crash if map unmounted
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
    }, []) // Init only once

    // Re-evaluate when filters change
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
            if(bounds.isValid()) {
                map.fitBounds(bounds, { padding: [50, 50] })
            }
        }
    },[routeGeometry])

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <div
                ref={mapContainerRef}
                style={{ width: '100%', height: '100%', borderRadius: '12px'}}
            />

            {/* Floating Map Filters Panel */}
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

            {selectedMapLocation && !reportLocation && (
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
                            📍 Set as Destination
                        </button>
                        
                        <button 
                            onClick={() => {
                                setReportLocation(selectedMapLocation);
                                setSelectedMapLocation(null);
                            }} 
                            style={{ padding: '10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            ⚠️ Report Hazard Here
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