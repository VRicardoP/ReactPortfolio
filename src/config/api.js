// Dirección del servidor (backend) al que la web pide los datos. En
// desarrollo se deja vacía porque Vite redirige las peticiones solita; en
// producción se configura con la URL real del servidor.

// In development, VITE_API_BASE_URL is unset and requests go through the Vite proxy (empty string = relative URLs).
// In production, set VITE_API_BASE_URL to the backend origin (e.g. https://api.example.com).
export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// Dirección del backend para el panel de administración. DT-203: el túnel
// público dejó de servir la API entera — solo responde las 9 rutas de la
// portada. El login y todo lo autenticado viven en la aplicación completa, que
// solo es alcanzable desde la red privada (Tailscale).
//
// DT-203: the public tunnel serves only the 9 portfolio routes. Auth and every
// authenticated route answer on the full app, reachable over Tailscale only.
// Set VITE_ADMIN_API_BASE_URL to that origin (e.g. https://host.tailnet.ts.net).
//
// Sin configurar cae en BACKEND_URL: en desarrollo ambas superficies son el
// mismo proceso detrás del proxy de Vite, así que el panel sigue funcionando
// sin tener que declarar nada.
export const ADMIN_BACKEND_URL = import.meta.env.VITE_ADMIN_API_BASE_URL ?? BACKEND_URL;

// Cabecera extra necesaria solo cuando el servidor está detrás de ngrok,
// para evitar una página de aviso que ngrok mostraría de otra forma.
// ngrok free plan intercepts browser requests with a warning page unless this header is present.
// Harmless when backend is not behind ngrok.
const cabecerasDe = (url) =>
    url.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {};

export const DEFAULT_HEADERS = cabecerasDe(BACKEND_URL);

// Las del panel se calculan aparte porque su base es otra: un backend servido
// por Tailscale no necesita la cabecera de ngrok.
export const ADMIN_HEADERS = cabecerasDe(ADMIN_BACKEND_URL);
