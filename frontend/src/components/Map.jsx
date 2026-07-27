import { useEffect, useRef } from "react";
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

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

    useEffect(() => {
        if (!mapContainerRef.current) return
        
        const map = L.map(mapContainerRef.current).setView([13.9414, 121.6236], 14)
        mapRef.current = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map)

        return () => {
            if(mapRef.current) {
                mapRef.current.remove()
                mapRef.current = null
            }
        }
    }, [])

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
        <div
            ref={mapContainerRef}
            style={{ width: '100%', height: '100%', borderRadius: '12px'}}
        />
    )
}