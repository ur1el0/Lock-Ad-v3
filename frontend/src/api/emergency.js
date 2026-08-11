import apiClient from './client';

export async function getEmergencyContacts() {
    const response = await apiClient.get('/emergency/contacts/');
    return response.data;
}

export async function addEmergencyContact(data) {
    const response = await apiClient.post('/emergency/contacts/', data);
    return response.data;
}

export async function deleteEmergencyContact(id) {
    const response = await apiClient.delete(`/emergency/contacts/${id}/`);
    return response.data;
}
