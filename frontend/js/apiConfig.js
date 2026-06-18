// Centralized API Configuration & Fetch Utility

const isLocal = window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1' ||
                window.location.protocol === 'file:';

export const API_BASE = isLocal
    ? 'http://localhost:5000'
    : 'https://fixmycity-api.onrender.com';

// Expose globally for non-module scripts
window.API_BASE = API_BASE;

/**
 * apiFetch — centralized fetch wrapper
 *  - Auto-injects Authorization header from localStorage
 *  - Throws on HTTP errors with a clean message
 *  - Redirects to login on 401 (expired/invalid token)
 *
 * @param {string} path    API path, e.g. '/api/auth/me'
 * @param {RequestInit} options  Standard fetch options (method, body, etc.)
 * @returns {Promise<any>} Parsed JSON body
 */
export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');

    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401) {
        // Token expired or invalid — clear and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        window.location.href = '/auth/login.html';
        return;
    }

    if (!res.ok) {
        let msg = `API error ${res.status}`;
        try { msg = (await res.json()).message || msg; } catch (_) {}
        throw new Error(msg);
    }

    return res.json();
}

// Also expose globally so non-module pages can call window.apiFetch(...)
window.apiFetch = apiFetch;
