export class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

const HTTP_ERROR_MESSAGES = {
    403: 'This request was blocked. Refresh the page and try again.',
    404: 'We couldn’t find that item. Refresh the page and try again.',
    408: 'This request took too long. Try again.',
    429: 'Please wait a moment before trying again.',
};

const VALIDATION_MESSAGES = {
    'An account with this username already exists.': 'That username is already taken. Choose a different username.',
    'Passwords do not match.': 'Passwords don’t match. Enter the same password in both fields.',
    'Username and password are required.': 'Enter your username and password, then try again.',
    'Image must be 5 MB or smaller.': 'Choose an image no larger than 5 MB.',
    'Image dimensions are too large to process.': 'Choose an image with smaller dimensions.',
    'Upload a valid image file.': 'This file isn’t a valid image. Choose a JPEG, PNG, or WebP image.',
    'Origin and destination cannot be the same point.': 'Choose different starting and destination coordinates.',
};

function formatFieldName(path) {
    const field = path.join(' ').replaceAll('_', ' ');
    if (field === 'password confirm') return 'Confirm password';
    if (field === 'non field errors') return '';
    return field.replace(/\b\w/g, character => character.toUpperCase());
}

function collectErrorMessages(value, path = []) {
    if (Array.isArray(value)) {
        return value.flatMap(item => collectErrorMessages(item, path));
    }

    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([field, nested]) =>
            collectErrorMessages(nested, [...path, field])
        );
    }

    if (typeof value !== 'string' || !value.trim()) return [];

    const field = formatFieldName(path);
    const message = VALIDATION_MESSAGES[value.trim()] ?? value;
    return [field ? `${field}: ${message}` : message];
}

function getErrorMessage(status, path, data) {
    if (status === 401) {
        return path.includes('/auth/login/')
            ? 'We couldn’t sign you in. Check your username and password, then try again.'
            : 'Sign in to continue, then try again.';
    }

    if (HTTP_ERROR_MESSAGES[status]) return HTTP_ERROR_MESSAGES[status];

    if (status >= 500) {
        return 'We couldn’t complete this request. Try again in a moment.';
    }

    if (status === 400) {
        if (typeof data?.detail === 'string' && data.detail.trim()) {
            return VALIDATION_MESSAGES[data.detail.trim()] ?? data.detail;
        }

        const validationMessages = collectErrorMessages(data?.detail ?? data);
        return validationMessages.length
            ? validationMessages.join(' | ')
            : 'Check the information you entered and try again.';
    }

    if (typeof data?.detail === 'string' && data.detail.trim()) {
        return data.detail;
    }

    return 'We couldn’t complete this request. Refresh the page and try again.';
}


export async function client(path, options = {}) {
    const { body, headers = {}, ...rest } = options

    const config = {
        ...rest,
        credentials: 'include', 
        headers: {
            ...headers,
        }
    };

    if (body !== undefined && body !== null) {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        if (isFormData) {
            config.body = body;
            for (const headerName of Object.keys(config.headers)) {
                if (headerName.toLowerCase() === 'content-type') {
                    delete config.headers[headerName];
                }
            }
        } else {
            config.headers['Content-Type'] = 'application/json';
            config.body = typeof body === 'object' ? JSON.stringify(body) : body;
        }
    }

    const response = await fetch(path, config);

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : null

    if(!response.ok) {
        const message = getErrorMessage(response.status, path, data);
        throw new APIError(message, response.status, data)
    }
    return data
}
