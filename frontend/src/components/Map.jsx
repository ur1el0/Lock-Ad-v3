import { useEffect, useRef, useCallback, useState } from "react";
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { fetchSafetySignals, fetchIncidents } from '../api/safety'
import { ReportModal } from './ReportModal'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png'
})

export function Map({ routeGeometry }) {
    const mapContainerRef = useRef(null)
    const mapRef = useRef(null)
    const geoJsonLayerRef = useRef(null)
    const markersLayerRef = useRef(null)

    // Modal state
    const [reportLocation, setReportLocation] = useState(null)

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

        // Right-click / context menu listener
        map.on('contextmenu', (e) => {
            setReportLocation(e.latlng)
        });

        return () => {
            if(mapRef.current) {
                mapRef.current.off('moveend');
                mapRef.current.off('contextmenu');
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