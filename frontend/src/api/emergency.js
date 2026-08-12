import { client } from './client';
import { getCsrfToken } from "./auth";

export async function getEmergencyContacts() {
    return client('/api/emergency/contacts/');
}

export async function addEmergencyContact(data) {
    const csrfToken = await getCsrfToken();
    return client('/api/emergency/contacts/', {
        method: 'POST',
        body: data,
        headers: {
            'X-CSRFToken': csrfToken
        }
    });
}

export async function deleteEmergencyContact(id) {
    const csrfToken = await getCsrfToken();
    return client(`/api/emergency/contacts/${id}/`, {
        method: 'DELETE',
        headers: {
            'X-CSRFToken': csrfToken
        }
    });
}
