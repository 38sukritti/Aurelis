/* =============================================================================
   API client: the only place the frontend talks to the AURELIS backend.
   ============================================================================= */

'use strict';

// If the frontend is hosted somewhere other than the backend (for example
// GitHub Pages or Netlify), put the deployed backend URL here, e.g.
// 'https://aurelis-api.onrender.com/api'. Leave it empty when the backend
// serves these pages itself.
const DEPLOYED_API_URL = '';

// Port of the backend when running it on your own machine (backend/.env).
const LOCAL_BACKEND_PORT = '5050';

const TOKEN_KEY = 'aurelis_token';

function resolveApiBaseUrl() {
    const isLocalPage = window.location.protocol === 'file:'
        || ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (isLocalPage) {
        // Pages served by the backend itself can use a relative URL; pages
        // opened from disk or from another dev server (e.g. Live Server on
        // port 5500) need the full address of the local backend.
        return window.location.port === LOCAL_BACKEND_PORT
            ? '/api'
            : `http://localhost:${LOCAL_BACKEND_PORT}/api`;
    }

    return DEPLOYED_API_URL || '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

class ApiError extends Error {
    constructor(message, status, details) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.details = details;
    }
}

const ApiClient = {
    API_BASE_URL,

    getToken: function() {
        return localStorage.getItem(TOKEN_KEY);
    },

    setToken: function(token) {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    },

    // Sends a JSON request and returns the parsed response body.
    // Throws an ApiError with a user-friendly message when anything fails.
    request: async function(path, { method = 'GET', body } = {}) {
        const headers = { Accept: 'application/json' };
        const token = this.getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        if (body !== undefined) headers['Content-Type'] = 'application/json';

        let response;
        try {
            response = await fetch(`${API_BASE_URL}${path}`, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body) : undefined
            });
        } catch (networkError) {
            throw new ApiError('Could not reach the AURELIS server. Check your connection and try again.', 0);
        }

        let data = null;
        try {
            data = await response.json();
        } catch (parseError) {
            data = null; // e.g. an HTML error page from a proxy
        }

        if (!response.ok) {
            const message = (data && data.message) || `Request failed (${response.status}).`;
            throw new ApiError(message, response.status, data && data.errors);
        }

        return data;
    }
};

window.ApiClient = ApiClient;
window.ApiError = ApiError;
