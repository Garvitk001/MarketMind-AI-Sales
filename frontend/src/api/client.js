const normalizeBaseUrl = (url) => {
  if (!url) return '';
  let cleaned = url.trim().replace(/\/+$/, '');
  if (!cleaned.endsWith('/api/v1')) {
    cleaned = `${cleaned}/api/v1`;
  }
  return cleaned;
};

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const defaultHost = typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : '127.0.0.1';
export const API_BASE_URL = rawBaseUrl 
  ? normalizeBaseUrl(rawBaseUrl) 
  : `http://${defaultHost}:8000/api/v1`;

export const resolveApiAsset = (path) => path ? `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}` : null;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const request = async (path, { token, ...options } = {}) => {
  const headers = {
    ...(options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.message || payload?.detail || 'Request failed', response.status);
  }
  return payload;
};
