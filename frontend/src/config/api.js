const PRODUCTION_API = 'https://aeroscript-production.up.railway.app';
const DEFAULT_API_ORIGIN = 'http://127.0.0.1:5002';

const trimTrailingSlash = (value) => value ? value.replace(/\/$/, '') : '';

const apiOrigin = trimTrailingSlash(
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_ORIGIN ||
  PRODUCTION_API
);

export const API_BASE = `${apiOrigin}/api`;
export const SOCKET_URL = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || apiOrigin);
