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