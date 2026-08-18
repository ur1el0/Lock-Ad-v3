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
    const [profile] = useState('foot-walking')
    
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
        <div className="flex h-screen w-screen overflow-hidden bg-muted/30">
            {/* Sidebar panel */}
            <aside className="w-[420px] bg-background/95 backdrop-blur-xl border-r border-border flex flex-col p-6 overflow-y-auto shrink-0 shadow-2xl z-20">
                
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-primary">Lock-Ad</h1>
                    <p className="text-sm font-medium text-muted-foreground mt-1">
                        {isTracking ? 'Active Trip' : 'Advisory Route Preview'}
                    </p>
                </div>
                {/* Profile Card */}
                <div className="bg-card border border-border p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center transition-all hover:shadow-md">
                    <div>
                        <p className="text-sm text-card-foreground m-0">Signed in as <strong className="font-bold">{user?.username}</strong></p>
                        <div className="flex gap-4 mt-2">
                            <Link to="/contacts" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                                Manage Contacts
                            </Link>
                            {user?.is_staff && (
                                <Link to="/moderator" className="text-xs font-bold text-destructive hover:text-red-700 flex items-center gap-1 transition-colors">
                                    <Shield className="w-3 h-3" /> Moderator
                                </Link>
                            )}
                        </div>
                    </div>
                    <button onClick={handleLogout} disabled={isTracking} className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-semibold rounded-lg border border-border hover:bg-secondary/80 transition-colors disabled:opacity-50">
                        Log out
                    </button>
                </div>

                {weather && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 px-5 py-3 rounded-2xl shadow-sm mb-6 flex items-center gap-4 cursor-default">
                        <div className="bg-primary/10 p-3 rounded-xl text-primary">
                            {weather.weathercode <= 3 ? <Sun className="w-6 h-6" /> : 
                             weather.weathercode <= 60 ? <Cloud className="w-6 h-6" /> : 
                             weather.weathercode <= 90 ? <CloudRain className="w-6 h-6" /> : 
                             <CloudLightning className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Current Weather</p>
                            <p className="text-xl font-black text-foreground flex items-baseline gap-1.5">
                                {weather.temperature}°C 
                                <span className="text-xs font-medium text-muted-foreground">({weather.windspeed} km/h)</span>
                            </p>
                        </div>
                    </div>
                )}

                {!isTracking ? (
                    <div className="flex flex-col gap-6">
                        
                        {/* Saved Routes */}
                        {savedRoutes.length > 0 && (
                            <div>
                                <p className="text-xs font-bold text-muted-foreground mb-3 uppercase tracking-wider">Quick Select</p>
                                <div className="flex flex-wrap gap-2">
                                    {savedRoutes.map(r => (
                                        <button 
                                            key={r.id} 
                                            onClick={() => handleSelectSavedRoute(r)}
                                            className="px-3 py-1.5 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5 hover:bg-indigo-100 transition-colors"
                                        >
                                            <Star className="w-3 h-3 fill-indigo-700" /> {r.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <form onSubmit={handleFetchRoute} className="flex flex-col gap-5">
                            
                            {/* Origin */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Origin</h3>
                                    <button 
                                        type="button" 
                                        onClick={handleUseCurrentLocation}
                                        disabled={locationLoading}
                                        className="text-blue-600 hover:text-blue-700 text-xs font-semibold flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer"
                                    >
                                        <MapPin className="w-3.5 h-3.5" />
                                        {locationLoading ? 'Locating...' : 'Use Current'}
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" step="any" placeholder="Lat" 
                                        value={originLat} onChange={(e) => setOriginLat(e.target.value)} required 
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
                                    />
                                    <input 
                                        type="number" step="any" placeholder="Lng" 
                                        value={originLng} onChange={(e) => setOriginLng(e.target.value)} required 
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                            </div>
                            {/* Destination */}
                            <div>
                                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Destination</h3>
                                <div className="flex gap-2">
                                    <input 
                                        type="number" step="any" placeholder="Lat" 
                                        value={destLat} onChange={(e) => setDestLat(e.target.value)} required 
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
                                    />
                                    <input 
                                        type="number" step="any" placeholder="Lng" 
                                        value={destLng} onChange={(e) => setDestLng(e.target.value)} required 
                                        className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all shadow-sm"
                                    />
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5 italic">Tap anywhere on the map to easily set a destination.</p>
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
                                {loading ? 'Fetching route...' : 'Get Route Preview'}
                            </button>
                        </form>
                        {error && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm font-semibold">
                                {error}
                            </div>
                        )}
                        {routeStats && (
                            <div className="pt-5 border-t border-border">
                                <h3 className="text-sm font-bold text-foreground mb-4">Route Details</h3>
                                
                                <div className="grid grid-cols-3 gap-3 mb-5">
                                    <div className="bg-card border border-border p-3 rounded-xl shadow-sm flex flex-col">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Distance</span>
                                        <span className="text-lg font-black text-foreground">{(routeStats.distance / 1000).toFixed(2)} km</span>
                                    </div>
                                    <div className="bg-card border border-border p-3 rounded-xl shadow-sm flex flex-col">
                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Time</span>
                                        <span className="text-lg font-black text-foreground">{Math.round(routeStats.duration / 60)} min</span>
                                    </div>
                                    <div className="bg-card p-3 rounded-xl shadow-sm flex flex-col border-2" style={{ borderColor: getScoreColor(routeStats.score) }}>
                                        <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: getScoreColor(routeStats.score) }}>Safety Score</span>
                                        <span className="text-lg font-black" style={{ color: getScoreColor(routeStats.score) }}>{routeStats.score}/100</span>
                                    </div>
                                </div>
                                
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl mb-4">
                                    <h4 className="text-xs font-bold text-blue-900 mb-2">Route Insights:</h4>
                                    <ul className="text-xs font-medium text-blue-800 space-y-1 pl-4 list-disc marker:text-blue-400 mb-4">
                                        {routeStats.advisories && routeStats.advisories.map((adv, idx) => (
                                            <li key={idx}>{adv}</li>
                                        ))}
                                    </ul>
                                    
                                    {/* AI ADVISORY WIDGET */}
                                    <div className="pt-3 border-t border-blue-200/60 mt-2">
                                        {!aiAdvisory ? (
                                            <button 
                                                onClick={(e) => { e.preventDefault(); handleGetAiAdvisory(); }} 
                                                disabled={fetchingAi}
                                                className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" /> 
                                                {fetchingAi ? 'Analyzing Route...' : 'Get AI Safety Advisory'}
                                            </button>
                                        ) : (
                                            <div className="bg-white/60 p-3 rounded-lg border border-blue-100 animate-in fade-in zoom-in-95">
                                                <div className="flex items-center gap-1.5 mb-2 text-indigo-700">
                                                    <Sparkles className="w-3.5 h-3.5" />
                                                    <h5 className="text-[10px] font-black uppercase tracking-wider m-0">Gemini AI Advisory</h5>
                                                </div>
                                                <p className="text-xs font-medium text-slate-700 leading-relaxed italic">"{aiAdvisory}"</p>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={handleStartTrip} className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 hover:shadow-emerald-500/30 transition-all flex justify-center items-center gap-2 mb-2">
                                        <PersonStanding className="w-5 h-5" /> Start Trip
                                    </button>
                                    
                                    <button onClick={handleSaveRoute} disabled={savingRoute} className="w-full py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 transition-all flex justify-center items-center gap-2">
                                        <Star className="w-4 h-4" /> {savingRoute ? 'Saving...' : 'Save Route'}
                                    </button> 
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // Tracking Mode UI (unchanged logic, just styled)
                    <div className="flex flex-col items-center text-center py-8">
                        <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shadow-inner mb-4">
                            <MapPin className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground mb-2">Tracking Active</h2>
                        <p className="text-sm font-medium text-muted-foreground mb-6">Follow the blue path on the map. Your location is being tracked in real-time.</p>
                        
                        <div className="w-full p-4 bg-muted/50 rounded-xl mb-6 text-left">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Destination</p>
                            <p className="text-sm font-mono font-bold">{destLat}, {destLng}</p>
                        </div>
                        <div className="w-full mb-6">
                            <h3 className="text-sm font-bold border-b border-border pb-2 mb-3 text-left">SOS Quick-Dial</h3>
                            {emergencyContacts.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {emergencyContacts.map(c => (
                                        <a key={c.id} href={`tel:${c.phone_number}`} className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors">
                                            <Phone className="w-4 h-4" /> Call {c.name}
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground italic text-left">No emergency contacts saved.</p>
                            )}
                            
                            <a href="tel:911" className="flex items-center justify-center gap-2 w-full py-3 bg-destructive text-destructive-foreground rounded-xl font-bold shadow-lg shadow-destructive/20 mt-3 hover:opacity-90 transition-opacity">
                                <AlertTriangle className="w-4 h-4" /> Call 911
                            </a>
                        </div>
                        <button onClick={handleEndTrip} className="w-full py-3 bg-secondary text-secondary-foreground font-bold rounded-xl hover:bg-secondary/80 flex items-center justify-center gap-2 transition-colors">
                            <Octagon className="w-5 h-5" /> End Trip
                        </button>
                    </div>
                )}
            </aside>
            <main className="flex-grow relative bg-slate-100">
                {/* Tailwind Styled Weather Overlay */}
                {weather && (
                    <div className="absolute top-6 right-6 z-30 bg-background/90 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-xl shadow-black/5 border border-border flex items-center gap-4 hover:-translate-y-1 transition-transform cursor-default">
                        <div className="bg-primary/5 p-3 rounded-xl text-primary">
                            {weather.weathercode <= 3 ? <Sun className="w-6 h-6" /> : 
                             weather.weathercode <= 60 ? <Cloud className="w-6 h-6" /> : 
                             weather.weathercode <= 90 ? <CloudRain className="w-6 h-6" /> : 
                             <CloudLightning className="w-6 h-6" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Current Weather</p>
                            <p className="text-xl font-black text-foreground flex items-baseline gap-1.5">
                                {weather.temperature}°C 
                                <span className="text-xs font-medium text-muted-foreground">({weather.windspeed} km/h)</span>
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
                    origin={{lat: parseFloat(originLat), lng: parseFloat(originLng)}}
                    destination={{lat: parseFloat(destLat), lng: parseFloat(destLng)}}
                    onArrived={handleArrived}
                    user={user}
                />
            </main>
        </div>
    )
}
