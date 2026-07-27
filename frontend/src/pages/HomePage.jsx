import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getRoutePreview } from "../api/navigation";
import { APIError } from "../api/client";

export function HomePage() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    // 1. Define states for coordinates (pre-populated with Lucena points)
    const [originLat, setOriginLat]  = useState('13.9381')
    const [originLng, setOriginLng] = useState('121.6238')
    const [destLat, setDestLat] = useState('13.9442')
    const [destLng, setDestLng] = useState('121.6179')
    const [profile, setProfile] = useState('foot-walking')
    
    // 2. Define states for API results and loading/error state
    const [routeGeometry, setRouteGeometry] = useState(null)
    const [routeStats, setRouteStats] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)

    // 3. Define logout handelr
    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    // 4. Define route submit handler
    async function handleFetchRoute(e){
        e.preventDefault()
        
        setLoading(true)
        setError(null)
        setRouteGeometry(null)
        setRouteStats(null)

        const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) }
        const destination = { lat: parseFloat(destLat), lng: parseFloat(destLng) }
        
        try {
            const data = await getRoutePreview(origin, destination, profile)
            
            setRouteGeometry(data.geometry)
            setRouteStats({
                distance: data.distance_meters,
                duration: data.duration_seconds,
                provider: data.provider
            })
        } catch (error) {
            if (error instanceof APIError) {
                setError(error.message)
            } else {
                setError('Unable to connect to the server.')
            }
        } finally {
            setLoading(false)
        }
    }

    // 5. Render the UI
    return (
        <div className="app-container">
        
        </div>
    )
}