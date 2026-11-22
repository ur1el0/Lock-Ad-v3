import { client, getAllPages } from './client';
import { getCsrfToken } from './auth'

export async function fetchSafetySignals({ min_lat, max_lat, min_lng, max_lng }) {
    const params = new URLSearchParams({
        min_lat,
        max_lat,
        min_lng,
        max_lng,
    });
    return getAllPages(`/api/safety/signals/?${params.toString()}`);
}

export async function fetchIncidents({ min_lat, max_lat, min_lng, max_lng }) {
    const params = new URLSearchParams({
        min_lat,
        max_lat,
        min_lng,
        max_lng,
    });
    return getAllPages(`/api/safety/incidents/?${params.toString()}`);
}

export async function getAllIncidentReports() {
    return getAllPages('/api/safety/incidents/')
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
    if (
        routeData?.distance_meters == null ||
        routeData?.duration_seconds == null ||
        weatherData?.weather_code == null ||
        weatherData?.temperature == null
    ) {
        throw new Error('Route and current weather data are required for an advisory.');
    }

    const csrfToken = await getCsrfToken()
    const data = {
        distance: routeData.distance_meters,
        duration: routeData.duration_seconds,
        weather_code: weatherData.weather_code,
        temperature: weatherData.temperature,
    }
    return await client('/api/safety/advisory/', {
        method: 'POST',
        body: data,
        headers: {
            'X-CSRFToken': csrfToken,
        }
    })
}
