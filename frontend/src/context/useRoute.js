import { useContext } from 'react';
import { RouteContext } from './routeContext';

export function useRoute() {
    const context = useContext(RouteContext);

    if (context === null) {
        throw new Error('useRoute must be used within a RouteProvider');
    }

    return context;
}
