import { client } from './client';

const AUTH_URL = '/api/auth/';

export async function getCsrfToken() {
    const data = await client(`${AUTH_URL}csrf/`)
    return data.csrfToken;
}

async function csrfPost(path, body) {
    const csrfToken = await getCsrfToken();

    return client(path, {
        method: 'POST',
        headers: {
            'X-CSRFToken': csrfToken,
        },
        body,
    })
}

export function registerUser(userData) {
    return csrfPost(`${AUTH_URL}register/`, userData);
}

export function loginUser(credentials) {
  return csrfPost(`${AUTH_URL}login/`, credentials)
}

export function getCurrentUser() {
  return client(`${AUTH_URL}me/`)
}

export function logoutUser() {
  return csrfPost(`${AUTH_URL}logout/`)
} 