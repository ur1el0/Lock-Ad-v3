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

                signals.forEach(signal => {
                    const marker = L.marker([signal.latitude, signal.longitude]);
                    marker.bindPopup(`<b>${signal.name}</b><br/>${signal.signal_type.replace('_', ' ')}`);
                    markersLayerRef.current.addLayer(marker);
                });

                incidents.forEach(incident => {
                    // In a future update we can use red icons for incidents
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
    }, [loadSafetyData])

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