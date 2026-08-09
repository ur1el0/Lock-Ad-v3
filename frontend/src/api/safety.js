import { client } from './client';
import { getCsrfToken } from './auth';

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

export async function createIncident(data) {
    const csrfToken = await getCsrfToken();
    return client('/api/safety/incidents/', {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken
        },
        body: data,
    });
}

