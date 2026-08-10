import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getRoutePreview } from "../api/navigation";
import { APIError } from "../api/client";
import { Map } from "../components/Map";

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
    const [locationLoading, setLocationLoading] = useState(false)

    // 4. Define logout handelr
    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    // Geolocation for Origin
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            return;
        }
        setLocationLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setOriginLat(position.coords.latitude.toFixed(6));
                setOriginLng(position.coords.longitude.toFixed(6));
                setLocationLoading(false);
            },
            () => {
                setError("Unable to retrieve your location");
                setLocationLoading(false);
            }
        );
    };

    // 5. Define route submit handler
    async function handleFetchRoute(e){
        if (e) e.preventDefault();
        
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

    // 6. Render the UI
    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>Lock-Ad</h1>
                    <p className="subtitle">Advisory Route Preview</p>
                </div>

                <div className="user-profile">
                    <p>Signed in as <strong>{user?.username}</strong></p>
                    <button onClick={handleLogout} className="btn-secondary btn-sm">
                        Log out
                    </button>
                </div>

                <form onSubmit={handleFetchRoute} className="route-form">
                    <div className="form-section">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3>Origin (Start)</h3>
                            <button 
                                type="button" 
                                onClick={handleUseCurrentLocation}
                                disabled={locationLoading}
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                            >
                                {locationLoading ? '📍 Locating...' : '📍 Use Current Location'}
                            </button>
                        </div>
                        <div className="input-group">
                            <input 
                                type="number" 
                                step="any"
                                placeholder="Latitude" 
                                value={originLat} 
                                onChange={(e) => setOriginLat(e.target.value)} 
                                required 
                            />
                            <input 
                                type="number" 
                                step="any"
                                placeholder="Longitude" 
                                value={originLng} 
                                onChange={(e) => setOriginLng(e.target.value)} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Destination (End)</h3>
                        <div className="input-group">
                            <input 
                                type="number" 
                                step="any"
                                placeholder="Latitude" 
                                value={destLat} 
                                onChange={(e) => setDestLat(e.target.value)} 
                                required 
                            />
                            <input 
                                type="number" 
                                step="any"
                                placeholder="Longitude" 
                                value={destLng} 
                                onChange={(e) => setDestLng(e.target.value)} 
                                required 
                            />
                        </div>
                        <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                            Tip: Tap anywhere on the map to easily set a destination.
                        </p>
                    </div>

                    <div className="form-section">
                        <h3>Profile</h3>
                        <select value={profile} onChange={(e) => setProfile(e.target.value)}>
                            <option value="foot-walking">Foot Walking</option>
                        </select>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? 'Fetching route...' : 'Get Route Preview'}
                    </button>
                </form>

                {error && (
                    <div className="error-panel">
                        <strong>Error:</strong> {error}
                    </div>
                )}

                {routeStats && (
                    <div className="route-details">
                        <h3>Route Details</h3>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <span className="stat-label">Distance</span>
                                <span className="stat-value">
                                    {(routeStats.distance / 1000).toFixed(2)} km
                                </span>
                            </div>
                            <div className="stat-card">
                                <span className="stat-label">Walking Time</span>
                                <span className="stat-value">
                                    {Math.round(routeStats.duration / 60)} mins
                                </span>
                            </div>
                        </div>
                        <div className="advisory-box">
                            <p><strong>Advisory Note:</strong> Route guidance is for planning purposes only. Real-world conditions, hazards, construction, lighting, or weather may differ from the map results.</p>
                        </div>
                    </div>
                )}
            </aside>

            <main className="map-wrapper">
                <Map 
                    routeGeometry={routeGeometry} 
                    onSetDestination={(latlng) => {
                        setDestLat(latlng.lat.toFixed(6));
                        setDestLng(latlng.lng.toFixed(6));
                    }}
                />
            </main>
        </div>
    )
}