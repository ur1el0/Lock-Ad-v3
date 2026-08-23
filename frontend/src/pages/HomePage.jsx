import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useRoute } from "../context/RouteContext";
import { Map } from "../components/Map";
import { LogOut, User } from 'lucide-react';

export function HomePage() {
    const { user, logout } = useAuth();
    const { originLat, originLng, destLat, destLng, routeGeometry, isTracking, setDestLat, setDestLng } = useRoute(); 
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <div className="h-screen w-screen relative bg-slate-100 overflow-hidden animate-in fade-in duration-500">
            <header className="absolute top-4 left-4 right-4 z-30 flex justify-between items-start pointer-events-none">
                <div className="bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-extrabold tracking-tight text-foreground m-0 leading-tight">Lock-Ad</h1>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                            {user?.role === 'MODERATOR' ? 'Moderator' : 'Resident'}
                        </p>
                    </div>
                </div>

                <button 
                    onClick={handleLogout} 
                    className="bg-card/90 backdrop-blur-md border border-border p-3 rounded-2xl shadow-lg pointer-events-auto text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors active:scale-95"
                    aria-label="Log out"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="w-full h-full pb-[72px]">
                <Map 
                    routeGeometry={routeGeometry} 
                    isTracking={isTracking}
                    origin={{lat: parseFloat(originLat), lng: parseFloat(originLng)}}
                    destination={{lat: parseFloat(destLat), lng: parseFloat(destLng)}}
                    onSetDestination={(latlng) => {
                        setDestLat(latlng.lat.toFixed(6));
                        setDestLng(latlng.lng.toFixed(6));
                    }}
                    user={user}
                />
            </main>
        </div>
    );
}
