const trimTrailingSlash = (value) => value ? value.replace(/\/$/, '') : '';

const apiOrigin = trimTrailingSlash(
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_ORIGIN
);

export const API_BASE = `${apiOrigin}/api`;
export const SOCKET_URL = trimTrailingSlash(import.meta.env.VITE_SOCKET_URL || apiOrigin);
