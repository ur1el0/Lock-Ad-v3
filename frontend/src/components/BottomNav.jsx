import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Map, Navigation, PhoneCall, ShieldCheck } from "lucide-react";

export function BottomNav() {
    const { user } = useAuth();
    const location = useLocation();

    const navItems = [
        {
            path: "/",
            label: "Map",
            icon: Map,
        },
        {
            path: "/route",
            label: "Plan Route",
            icon: Navigation,
        },
        {
            path: "/contacts",
            label: "SOS / Contacts",
            icon: PhoneCall,
        },
    ];

    // Conditionally include the Moderator tab for staff/moderators
    if (user?.role === "MODERATOR") {
        navItems.push({
            path: "/moderator",
            label: "Moderator",
            icon: ShieldCheck,
        });
    }

    return (
        <nav 
            className="fixed bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border shadow-lg px-2 py-2"
            aria-label="Mobile Navigation"
        >
            <div className="max-w-md mx-auto flex items-center justify-around">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;

                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-200 ${
                                isActive
                                    ? "text-primary font-bold bg-primary/10 scale-105"
                                    : "text-muted-foreground hover:text-foreground font-medium hover:bg-muted/50"
                            }`}
                            aria-current={isActive ? "page" : undefined}
                        >
                            <Icon 
                                className={`w-5 h-5 transition-transform ${isActive ? "stroke-[2.5px]" : "stroke-[1.75px]"}`} 
                                aria-hidden="true" 
                            />
                            <span className="text-[10px] tracking-tight">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
