import { client } from './client';
import { getCsrfToken } from './auth'

export async function fetchSafetySignals({ min_lat, max_lat, min_lng, max_lng }) {
    const params = new URLSearchParams({
        min_lat,
        max_lat,
        min_lng,
        max_lng,
    });
    return client(`/api/safety/signals/?${params.toString()}`);
}

export async function fetchIncidents({ min_lat, max_lat, min_lng, max_lng }) {
    const params = new URLSearchParams({
        min_lat,
        max_lat,
        min_lng,
        max_lng,
    });
    return client(`/api/safety/incidents/?${params.toString()}`);
}

export async function getAllIncidentReports() {
    return client('/api/safety/incidents/')
}

export async function createIncident(data) {
    const csrfToken = await getCsrfToken();
    return client('/api/safety/incidents/', {
        method: 'POST',
        body: data,
        headers: {
            'X-CSRFToken': csrfToken,
        }
    });
}
    
export async function updateIncidentReport(id, data )   {
    const csrfToken = await getCsrfToken()
    return client(`/api/safety/incidents/${id}/`, {
        method: 'PATCH',
        body: data,
        headers: {
            'X-CSRFToken': csrfToken,
        }
    })
}

export const getWeather = async (lat, lng) => {
    return await client(`/api/safety/weather/?lat=${lat}&lng=${lng}`);
}

export const getAiAdvisory = async (routeData, weatherData) => {
    const csrfToken = await getCsrfToken()
    const data= {
        distance: routeData?.distance_meters || 0,
        duration: routeData?.duration_seconds || 0,
        weather_code: weatherData?.weathercode || 0,
        temperature: weatherData?.temperature || 0
    }
    return await client('/api/safety/advisory/', {
        method: 'POST',
        body: data,
        headers: {
            'X-CSRFToken': csrfToken,
        }
    })
}