/**
 * socket.js — Singleton Socket.io connection manager
 *
 * Guarantees at most ONE socket connection per page session.
 * Only connects after a valid auth token is confirmed.
 *
 * Usage (in any page script):
 *   import { getSocket } from '/js/socket.js';
 *   const socket = getSocket();
 *   socket.on('new-community-post', handler);
 *
 * For non-module scripts:
 *   const socket = window.getSocket();
 */

const BACKEND_URL = (() => {
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';
    return isLocal
        ? 'http://localhost:5000'
        : 'https://fixmycity-api.onrender.com';
})();

let _socket = null;

/**
 * Returns the shared socket instance, creating it once if needed.
 * Returns null if there is no auth token (user not logged in).
 */
export function getSocket() {
    if (_socket) return _socket;

    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('[socket.js] No auth token — skipping socket connection.');
        return null;
    }

    // Guard: socket.io client must be loaded via <script> tag on the page
    if (typeof io === 'undefined') {
        console.error('[socket.js] socket.io client not found. Add the <script> tag first.');
        return null;
    }

    _socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'], // try WS first
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        timeout: 10000
    });

    _socket.on('connect', () => {
        console.log('[socket.js] Connected:', _socket.id);
    });

    _socket.on('connect_error', (err) => {
        console.warn('[socket.js] Connection error:', err.message);
    });

    _socket.on('disconnect', (reason) => {
        console.log('[socket.js] Disconnected:', reason);
        // Clear the singleton if the server forced disconnect so next
        // call to getSocket() creates a fresh connection
        if (reason === 'io server disconnect') {
            _socket = null;
        }
    });

    return _socket;
}

/**
 * Explicitly disconnect and clear the singleton.
 * Call on logout.
 */
export function disconnectSocket() {
    if (_socket) {
        _socket.disconnect();
        _socket = null;
    }
}

// Expose globally for non-module scripts
window.getSocket = getSocket;
window.disconnectSocket = disconnectSocket;
