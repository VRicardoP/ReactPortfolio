// Dirección del servidor (backend) al que la web pide los datos. En
// desarrollo se deja vacía porque Vite redirige las peticiones solita; en
// producción se configura con la URL real del servidor.

// In development, VITE_API_BASE_URL is unset and requests go through the Vite proxy (empty string = relative URLs).
// In production, set VITE_API_BASE_URL to the backend origin (e.g. https://api.example.com).
export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// Cabecera extra necesaria solo cuando el servidor está detrás de ngrok,
// para evitar una página de aviso que ngrok mostraría de otra forma.
// ngrok free plan intercepts browser requests with a warning page unless this header is present.
// Harmless when backend is not behind ngrok.
export const DEFAULT_HEADERS = BACKEND_URL.includes('ngrok')
    ? { 'ngrok-skip-browser-warning': 'true' }
    : {};
