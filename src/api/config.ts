const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawPublicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;

export const API_BASE_URL =
  rawApiBaseUrl === undefined || rawApiBaseUrl === null
    ? "http://127.0.0.1:8000"
    : rawApiBaseUrl.replace(/\/$/, "");

export const ADMIN_API_PREFIX = "/api/admin";

export const PUBLIC_SITE_URL =
  rawPublicSiteUrl === undefined || rawPublicSiteUrl === null
    ? "http://localhost:3000"
    : rawPublicSiteUrl.replace(/\/$/, "");

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE_URL === "") {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export function getPublicPageUrl(publicPath: string) {
  const normalizedPath = publicPath.startsWith("/")
    ? publicPath
    : `/${publicPath}`;

  if (normalizedPath === "/") {
    return `${PUBLIC_SITE_URL}/`;
  }

  return `${PUBLIC_SITE_URL}${normalizedPath}`;
}
