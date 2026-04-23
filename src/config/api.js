// In development, VITE_API_BASE_URL is unset and requests go through the Vite proxy (empty string = relative URLs).
// In production, set VITE_API_BASE_URL to the backend origin (e.g. https://api.example.com).
export const BACKEND_URL = import.meta.env.VITE_API_BASE_URL ?? '';
