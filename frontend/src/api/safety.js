import { client } from './client';
import { getCsrfToken } from './token'

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

