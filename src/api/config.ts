const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export const API_BASE_URL =
  rawApiBaseUrl === undefined || rawApiBaseUrl === null
    ? "http://127.0.0.1:8000"
    : rawApiBaseUrl.replace(/\/$/, "");

export const ADMIN_API_PREFIX = "/api/admin";

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE_URL === "") {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}
