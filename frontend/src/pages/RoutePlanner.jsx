import { useState, useEffect } from "react";
import { getRoutePreview, getSavedRoutes, createSavedRoute } from "../api/navigation";
import { getAiAdvisory, getWeather } from "../api/safety";
import { APIError } from "../api/client";
import { 
    Cloud, Sun, CloudRain, CloudLightning, Sparkles, Shield, 
    Star, MapPin, PersonStanding, AlertTriangle 
} from 'lucide-react';
import { useRoute } from "../context/RouteContext";

import { useRoute } from "../context/RouteContext"; // <-- Import it at the top

export function RoutePlannerPage() {
    const { 
        originLat, setOriginLat, 
        originLng, setOriginLng, 
        destLat, setDestLat, 
        destLng, setDestLng,
        routeStats, setRouteStats,
        routeGeometry, setRouteGeometry,
        aiAdvisory, setAiAdvisory
    } = useRoute();

    const [profile] = useState('foot-walking');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [locationLoading, setLocationLoading] = useState(false);
    
    const [savedRoutes, setSavedRoutes] = useState([]);
    const [savingRoute, setSavingRoute] = useState(false);
    const [weather, setWeather] = useState(null);
    const [fetchingAi, setFetchingAi] = useState(false);

    useEffect(() => {
        getSavedRoutes().then(setSavedRoutes).catch(err => console.error("Failed to fetch saved routes", err));
    }, []);

    // Weather fetch based on origin
    useEffect(() => {
        if (originLat && originLng) {
            getWeather(originLat, originLng)
                .then(data => setWeather(data))
                .catch(err => console.error("Failed to fetch weather", err));
        } else {
            setWeather(null);
        }
    }, [originLat, originLng]);

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

    const handleSelectSavedRoute = (route) => {
        setOriginLat(route.origin_lat);
        setOriginLng(route.origin_lng);
        setDestLat(route.dest_lat);
        setDestLng(route.dest_lng);
    };

    const handleSaveRoute = async () => {
        const name = window.prompt("Enter a name for this route:");
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
            console.error(e);
            alert("Failed to save route. Please try again.");
        } finally {
            setSavingRoute(false);
        }
    };

    async function handleFetchRoute(e) {
        if (e) e.preventDefault();
        setLoading(true);
        setError(null);
        setRouteStats(null);
        setRouteGeometry(null)
        setAiAdvisory(null);

        const origin = { lat: parseFloat(originLat), lng: parseFloat(originLng) };
        const destination = { lat: parseFloat(destLat), lng: parseFloat(destLng) };
        
        try {
            const data = await getRoutePreview(origin, destination, profile);
            setRouteGeometry(data.geometry)
            setRouteStats({
                distance: data.distance_meters,
                duration: data.duration_seconds,
                provider: data.provider,
                score: data.safety_score,
                advisories: data.advisories
            });
        } catch (error) {
            if (error instanceof APIError) {
                setError(error.message);
            } else {
                setError('Failed to fetch route preview. Check your connection.');
            }
        } finally {
            setLoading(false);
        }
    }

    const requestAiAdvisory = async () => {
        if (!routeStats) return;
        setFetchingAi(true);
        setAiAdvisory(null);

        try {
            const result = await getAiAdvisory({
                origin_lat: parseFloat(originLat),
                origin_lng: parseFloat(originLng),
                dest_lat: parseFloat(destLat),
                dest_lng: parseFloat(destLng),
                distance_meters: routeStats.distance,
                duration_seconds: routeStats.duration,
                profile: profile,
                weather_context: weather
            });
            setAiAdvisory(result);
        } catch (error) {
            console.error(error);
            alert("Failed to get AI advisory");
        } finally {
            setFetchingAi(false);
        }
    };

    const getWeatherIcon = (condition) => {
        if (!condition) return <Cloud className="w-5 h-5" />;
        const lower = condition.toLowerCase();
        if (lower.includes('rain')) return <CloudRain className="w-5 h-5 text-blue-500" />;
        if (lower.includes('thunder')) return <CloudLightning className="w-5 h-5 text-purple-500" />;
        if (lower.includes('clear') || lower.includes('sun')) return <Sun className="w-5 h-5 text-yellow-500" />;
        return <Cloud className="w-5 h-5 text-slate-400" />;
    };

    return (
        <div className="min-h-screen bg-background pb-24 pt-6 px-4 animate-in fade-in duration-300">
            <div className="max-w-md mx-auto space-y-6">
                
                <header>
                    <h1 className="text-2xl font-black text-foreground m-0">Plan Route</h1>
                    <p className="text-sm text-muted-foreground mt-1">Configure your destination and check safety advisories.</p>
                </header>

                {/* Weather Widget */}
                {weather && (
                    <div className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Weather</span>
                            <span className="text-lg font-bold text-foreground capitalize mt-0.5">{weather.condition}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl font-black">{Math.round(weather.temperature)}°C</span>
                            <div className="p-2 bg-muted rounded-xl">
                                {getWeatherIcon(weather.condition)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Route Form */}
                <form onSubmit={handleFetchRoute} className="bg-card border border-border p-5 rounded-3xl shadow-sm flex flex-col gap-5">
                    
                    {error && (
                        <div className="bg-destructive/10 text-destructive text-sm font-bold p-3 rounded-xl flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Origin</label>
                            <button 
                                type="button" 
                                onClick={handleUseCurrentLocation}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                disabled={locationLoading}
                            >
                                <MapPin className="w-3 h-3" /> {locationLoading ? 'Locating...' : 'Use Current'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Lat"
                                value={originLat}
                                onChange={(e) => setOriginLat(e.target.value)}
                                required
                                className="bg-muted/50 border border-input rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            />
                            <input
                                type="text"
                                placeholder="Lng"
                                value={originLng}
                                onChange={(e) => setOriginLng(e.target.value)}
                                required
                                className="bg-muted/50 border border-input rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Destination</label>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="text"
                                placeholder="Lat"
                                value={destLat}
                                onChange={(e) => setDestLat(e.target.value)}
                                required
                                className="bg-muted/50 border border-input rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            />
                            <input
                                type="text"
                                placeholder="Lng"
                                value={destLng}
                                onChange={(e) => setDestLng(e.target.value)}
                                required
                                className="bg-muted/50 border border-input rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-foreground text-background py-3.5 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Calculating Route...' : 'Preview Route Options'}
                    </button>
                </form>

                {/* Saved Routes Section */}
                {savedRoutes.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-foreground">Saved Routes</h3>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {savedRoutes.map(route => (
                                <button
                                    key={route.id}
                                    onClick={() => handleSelectSavedRoute(route)}
                                    className="flex items-center gap-1.5 whitespace-nowrap px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-full hover:bg-secondary/80 transition-colors"
                                >
                                    <Star className="w-3.5 h-3.5" />
                                    {route.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Route Preview Results */}
                {routeStats && (
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-5 animate-in slide-in-from-bottom-4">
                        <div className="flex items-center gap-2 text-primary font-bold">
                            <PersonStanding className="w-5 h-5" />
                            <span>Route Details</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-muted/50 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Distance</span>
                                <span className="text-lg font-black text-foreground">{(routeStats.distance / 1000).toFixed(2)} km</span>
                            </div>
                            <div className="bg-muted/50 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Safety Score</span>
                                <span className={`text-lg font-black ${routeStats.score >= 80 ? 'text-emerald-500' : routeStats.score >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>
                                    {routeStats.score}/100
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveRoute}
                                disabled={savingRoute}
                                className="flex-1 py-3 bg-secondary text-secondary-foreground text-xs font-bold rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50"
                            >
                                {savingRoute ? 'Saving...' : 'Save Route'}
                            </button>
                            <button
                                onClick={requestAiAdvisory}
                                disabled={fetchingAi}
                                className="flex-[2] flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
                            >
                                <Sparkles className="w-4 h-4" />
                                {fetchingAi ? 'Analyzing...' : 'Get AI Advisory'}
                            </button>
                        </div>

                        {/* AI Advisory Result */}
                        {aiAdvisory && (
                            <div className="mt-4 p-4 bg-violet-500/10 border border-violet-500/20 rounded-2xl animate-in fade-in">
                                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-black text-sm mb-2">
                                    <Shield className="w-4 h-4" /> AI Safety Advisory
                                </div>
                                <div className="prose prose-sm prose-violet dark:prose-invert max-w-none text-sm">
                                    {aiAdvisory.advisory}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
