import { client } from './client';
import { getCsrfToken } from './auth'

export async function getAllIncidentReports() {
    return client('/api/safety/incidents/')
}
    
export async function updateIncidentReport(id, data )   {
    const csrfToken = await getCsrfToken()
    return client(`/api/safety/incidents/${id}`, {
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
