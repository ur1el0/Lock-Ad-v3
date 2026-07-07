import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function GuestOnlyRoute({ children }) {
    const {isLoading, isAuthenticated } = useAuth()

    if(isLoading){
        return <p>Loading...</p>
    }

    if(isAuthenticated) {
        return <Navigate to="/" replace />
    }

    return children
}