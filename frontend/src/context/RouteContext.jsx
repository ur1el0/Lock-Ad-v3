import { useState } from 'react';
import { RouteContext } from './routeContext';

export const RouteProvider = ({ children }) => {
    const [originLat, setOriginLat] = useState('13.9381');
    const [originLng, setOriginLng] = useState('121.6238');
    const [destLat, setDestLat] = useState('13.9442');
    const [destLng, setDestLng] = useState('121.6179');
    const [routeGeometry, setRouteGeometry] = useState(null);
    const [routeStats, setRouteStats] = useState(null);
    const [aiAdvisory, setAiAdvisory] = useState(null);
    const [isTracking, setIsTracking] = useState(false);

    return (
        <RouteContext.Provider value={{
            originLat, setOriginLat,
            originLng, setOriginLng,
            destLat, setDestLat,
            destLng, setDestLng,
            routeGeometry, setRouteGeometry,
            routeStats, setRouteStats,
            aiAdvisory, setAiAdvisory,
            isTracking, setIsTracking,
        }}>
            {children}
        </RouteContext.Provider>
    );
};
