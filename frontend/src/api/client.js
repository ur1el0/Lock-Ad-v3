export class APIError extends Error {
    constructor(message, status, data) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
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
        config.headers['Content-Type'] = 'application/json';
        config.body = typeof body === 'object' 
        ? JSON.stringify(body) 
        : body;
    }

    const response = await fetch(path, config);

    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : null

    if(!response.ok) {
        // Attempt to extract Django DRF dictionary errors
        let parsedMessage = data?.detail
        
        if(!parsedMessage && data && typeof data === 'object') {
            parsedMessage = Object.entries(data)
                .map(([field, errors]) => {
                    const formattedField = field.charAt(0).toUpperCase() + field.slice(1)
                    const errorStr = Array.isArray(errors) ? errors.join(' ') : errors
                    return `${formattedField}: ${errorStr}`
                })
                .join(' | ')
        }

        const message = parsedMessage || `Request failed with status ${response.status}`

        throw new APIError(message, response.status, data)
    }
    return data
}
