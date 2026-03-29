const DEFAULT_API_ORIGIN = 'http://127.0.0.1:5002';
const DEFAULT_HAND_TRACKING_ORIGIN = 'http://127.0.0.1:5001';

const trimTrailingSlash = (value) => value.replace(/\/$/, '');

const apiOrigin = trimTrailingSlash(import.meta.env.VITE_API_ORIGIN || DEFAULT_API_ORIGIN);
const handTrackingOrigin = trimTrailingSlash(import.meta.env.VITE_HAND_TRACKING_ORIGIN || DEFAULT_HAND_TRACKING_ORIGIN);

export const API_BASE = `${apiOrigin}/api`;
export const HAND_TRACKING_SOCKET_URL = handTrackingOrigin;
