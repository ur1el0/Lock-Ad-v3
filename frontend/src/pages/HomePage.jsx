import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { getRoutePreview, getSavedRoutes, createSavedRoute } from "../api/navigation";
import { getEmergencyContacts } from "../api/emergency";
import { APIError } from "../api/client";
import { Map } from "../components/Map";
import { getAiAdvisory, getWeather } from "../api/safety";
import { Cloud, Sun, CloudRain, CloudLightning, Sparkles, Shield, Star, MapPin, PersonStanding, Octagon, Phone, AlertTriangle } from 'lucide-react'

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
    
    // 3. Trip Tracking & Emergency Contacts State
    const [isTracking, setIsTracking] = useState(false)
    const [emergencyContacts, setEmergencyContacts] = useState([])
    
    // 4. Saved Routes
    const [savedRoutes, setSavedRoutes] = useState([])
    const [savingRoute, setSavingRoute] = useState(false)

    const [weather, setWeather] = useState(null);

    const [aiAdvisory, setAiAdvisory] = useState(null)
    const [fetchingAi, setFetchingAi] = useState(false)


    // Initial data fetch
    useEffect(() => {
        getSavedRoutes().then(setSavedRoutes).catch(err => console.error("Failed to fetch saved routes", err));
        getEmergencyContacts().then(setEmergencyContacts).catch(err => console.error("Failed to fetch contacts", err))
    }, []);

    useEffect(() => {
        if (originLat && originLng) {
            getWeather(originLat, originLng)
                .then(data => setWeather(data))
                .catch(err => console.error("Failed to fetch weather", err))
        } else {
            // eslint-disable-next-line
            setWeather(null)
        }
    }, [originLat, originLng])

    // Fetch emergency contacts when tracking starts
    useEffect(() => {
        if (isTracking) {
            getEmergencyContacts().then(setEmergencyContacts).catch(err => console.error("Failed to fetch contacts", err));
        }
    }, [isTracking]);

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

    // Quick select saved route
    const handleSelectSavedRoute = (route) => {
        setOriginLat(route.origin_lat);
        setOriginLng(route.origin_lng);
        setDestLat(route.dest_lat);
        setDestLng(route.dest_lng);
    };

    // Save current route
    const handleSaveRoute = async () => {
        const name = window.prompt("Enter a name for this route (e.g. Home to Campus):");
        if (!name) return;
        
        setSavingRoute(true);
        try {
            const newRoute = await createSavedRoute({
                name,
                origin_lat: parseFloat(originLat),
                origin_lng: parseFloat(originLng),
                dest_lat: parseFloat(destLat),
                dest_lng: parseFloat(destLng)
            });
            setSavedRoutes([newRoute, ...savedRoutes]);
            alert("Route saved successfully!");
        } catch (e) {
            console.error(e)
            alert("Failed to save route. Please try again.");
        } finally {
            setSavingRoute(false);
        }
    };

    // 5. Define route submit handler
    async function handleFetchRoute(e){
        if (e) e.preventDefault();
        
        setLoading(true)
        setError(null)
        setRouteGeometry(null)
        setRouteStats(null)
        setAiAdvisory(null)

        const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) }
        const destination = { lat: parseFloat(destLat), lng: parseFloat(destLng) }
        
        try {
            const data = await getRoutePreview(origin, destination, profile)
            
            setRouteGeometry(data.geometry)
            setRouteStats({
                distance: data.distance_meters,
                duration: data.duration_seconds,
                provider: data.provider,
                score: data.safety_score,
                advisories: data.advisories
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

    // Determine score color
    const getScoreColor = (score) => {
        if (score >= 80) return '#10b981'; // Green
        if (score >= 50) return '#f59e0b'; // Yellow
        return '#ef4444'; // Red
    };

    // Trip Handlers
    const handleStartTrip = () => {
        setIsTracking(true);
    };

    const handleEndTrip = () => {
        setIsTracking(false);
    };

    const handleArrived = () => {
        alert("You have arrived at your destination!");
        setIsTracking(false);
    };

    const handleGetAiAdvisory = async () => {
        setFetchingAi(true)
        try {
            const data= await getAiAdvisory(routeStats, weather)
            setAiAdvisory(data.advisory)
        } catch (e) {
            console.error(e)
            alert("Failed to get AI Advisory. Please try again.")
        } finally {
            setFetchingAi(false)
        }
    }
    // 6. Render the UI
    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h1>Lock-Ad</h1>
                    <p className="subtitle">{isTracking ? 'Active Trip' : 'Advisory Route Preview'}</p>
                </div>

                <div className="user-profile">
                    <div>
                        <p style={{ margin: 0 }}>Signed in as <strong>{user?.username}</strong></p>
                        
                        <div style={{ display: 'flex', gap: '12px', marginTop: '4px' }}>
                            <Link to="/contacts" style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none' }}>
                                Manage Emergency Contacts
                            </Link>
                            
                            {user?.is_staff && (
                                <Link to="/moderator" style={{ fontSize: '12px', color: '#dc2626', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Shield className="w-3 h-3" /> Moderator Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary btn-sm" disabled={isTracking}>
                        Log out
                    </button>
                </div>


                {!isTracking ? (
                    <>
                        {savedRoutes.length > 0 && (
                            <div style={{ padding: '0 24px 16px 24px' }}>
                                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#6b7280', margin: '0 0 8px 0', textTransform: 'uppercase' }}>Quick Select</p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {savedRoutes.map(r => (
                                        <button 
                                            key={r.id} 
                                            type="button"
                                            onClick={() => handleSelectSavedRoute(r)}
                                            style={{ padding: '6px 12px', fontSize: '13px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '16px', cursor: 'pointer' }}
                                        >
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                                <Star className="w-3 h-3" /> {r.name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin className="w-4 h-4" />
                                            {locationLoading ? 'Locating...' : 'Use Current Location'}
                                        </span>
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
                                <div className="stats-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
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
                                    <div className="stat-card" style={{ borderColor: getScoreColor(routeStats.score), borderWidth: '2px', borderStyle: 'solid' }}>
                                        <span className="stat-label" style={{ color: getScoreColor(routeStats.score) }}>Safety Score</span>
                                        <span className="stat-value" style={{ color: getScoreColor(routeStats.score) }}>
                                            {routeStats.score}/100
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="advisory-box">
                                    <h4 style={{ marginTop: 0, marginBottom: '8px', fontSize: '13px' }}>Route Insights:</h4>
                                    <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#374151' }}>
                                        {routeStats.advisories && routeStats.advisories.map((adv, idx) => (
                                            <li key={idx} style={{ marginBottom: '4px' }}>{adv}</li>
                                        ))}
                                    </ul>
                                    <p style={{ marginTop: '12px', fontSize: '11px', fontStyle: 'italic', color: '#6b7280' }}>
                                        Advisory Note: Route guidance is for planning purposes only. Real-world conditions may differ.
                                    </p>
                                    {aiAdvisory ? (
                                    <div style={{ marginTop: '12px', padding: '12px', background: 'linear-gradient(to right, #fef3c7, #fef08a)', borderRadius: '8px', border: '1px solid #fde047' }}>
                                        <p style={{ margin: 0, fontSize: '13px', color: '#854d0e', fontWeight: '500', display: 'flex', gap: '8px' }}>
                                            <Sparkles className="w-4 h-4 flex-shrink-0" /> {aiAdvisory}
                                        </p>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={handleGetAiAdvisory}
                                        disabled={fetchingAi}
                                        style={{ marginTop: '12px', padding: '8px', background: 'white', color: '#ca8a04', border: '1px solid #fde047', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', boxShadow: '0 2px 4px rgba(253, 224, 71, 0.2)' }}
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {fetchingAi ? 'Generating Advisory...' : 'Generate AI Safety Advisory'}
                                    </button>
                                )}
                                </div>

                                <button 
                                    onClick={handleStartTrip} 
                                    style={{ marginTop: '16px', padding: '12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <PersonStanding className="w-5 h-5" /> Start Trip
                                    </span>
                                </button>
                                
                                <button 
                                    onClick={handleSaveRoute}
                                    disabled={savingRoute}
                                    style={{ marginTop: '8px', padding: '12px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', width: '100%' }}
                                >
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                        <Star className="w-4 h-4" /> {savingRoute ? 'Saving...' : 'Save Route'}
                                    </span>
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="active-trip-panel" style={{ padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%', background: '#d1fae5', color: '#10b981', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', marginBottom: '16px'
                        }}>
                            <MapPin className="w-8 h-8" />
                        </div>
                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', color: '#111827' }}>Tracking Active</h2>
                        <p style={{ color: '#4b5563', marginBottom: '24px' }}>Follow the blue path on the map. Your location is being tracked in real-time.</p>
                        
                        <div style={{ width: '100%', padding: '16px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '24px' }}>
                            <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', fontWeight: 'bold' }}>Destination</p>
                            <p style={{ margin: 0, fontSize: '14px', fontFamily: 'monospace' }}>{destLat}, {destLng}</p>
                        </div>

                        {/* SOS Quick Dial Section */}
                        <div style={{ width: '100%', marginBottom: '24px', textAlign: 'left' }}>
                            <h3 style={{ fontSize: '16px', color: '#111827', marginBottom: '12px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>SOS Quick-Dial</h3>
                            {emergencyContacts.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {emergencyContacts.map(c => (
                                        <a key={c.id} href={`tel:${c.phone_number}`} style={{ 
                                            display: 'block', padding: '12px', background: '#fee2e2', color: '#dc2626', 
                                            textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center',
                                            border: '1px solid #fca5a5'
                                        }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                <Phone className="w-4 h-4" /> Call {c.name} ({c.relationship})
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', margin: '0 0 12px 0' }}>No emergency contacts saved.</p>
                            )}
                            
                            <a href="tel:911" style={{ 
                                display: 'block', padding: '12px', background: '#ef4444', color: 'white', 
                                textDecoration: 'none', borderRadius: '8px', fontWeight: 'bold', textAlign: 'center', marginTop: '12px'
                            }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                    <AlertTriangle className="w-4 h-4" /> Call Local Emergency (911)
                                </span>
                            </a>
                        </div>

                        <button 
                            onClick={handleEndTrip} 
                            style={{ padding: '12px', background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', width: '100%' }}
                        >
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Octagon className="w-5 h-5" /> End Trip
                            </span>
                        </button>
                    </div>
                )}
            </aside>

            <main className="map-wrapper" style={{ position: 'relative' }}>
                {/* Weather Overlay */}
                {weather && (
                    <div className="absolute top-6 right-6 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg border border-slate-200/50 flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
                            {weather.weathercode <= 3 ? <Sun className="w-5 h-5" /> : 
                             weather.weathercode <= 60 ? <Cloud className="w-5 h-5" /> : 
                             weather.weathercode <= 90 ? <CloudRain className="w-5 h-5" /> : 
                             <CloudLightning className="w-5 h-5" />}
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Weather</p>
                            <p className="text-lg font-extrabold text-slate-800">
                                {weather.temperature}°C <span className="text-sm font-medium text-slate-500 ml-1">({weather.windspeed} km/h wind)</span>
                            </p>
                        </div>
                    </div>
                )}

                <Map 
                    routeGeometry={routeGeometry} 
                    onSetDestination={(latlng) => {
                        setDestLat(latlng.lat.toFixed(6));
                        setDestLng(latlng.lng.toFixed(6));
                    }}
                    isTracking={isTracking}
                    destination={{lat: parseFloat(destLat), lng: parseFloat(destLng)}}
                    onArrived={handleArrived}
                />
            </main>
            
        </div>
    )
}