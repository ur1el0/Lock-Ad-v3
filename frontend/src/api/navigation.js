import { client } from "./client";
import { getCsrfToken } from "./auth";

export async function getRoutePreview(origin, destination, profile = 'foot-walking') {
    const csrfToken = await getCsrfToken();

    return client('/api/navigation/routes/preview/', {
        method: 'POST',
        body: {
            origin,
            destination,
            profile
        },
        headers: {
            'X-CSRFToken': csrfToken
        }
    })
}

export async function getSavedRoutes() {
    return client('/api/navigation/saved-routes/');
}

export async function createSavedRoute(data) {
    const csrfToken = await getCsrfToken();
    return client('/api/navigation/saved-routes/', {
        method: 'POST',
        body: data,
        headers: {
            'X-CSRFToken': csrfToken
        }
    });
}

export async function deleteSavedRoute(id) {
    const csrfToken = await getCsrfToken();
    return client(`/api/navigation/saved-routes/${id}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': csrfToken
        }
    });
}