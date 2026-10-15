const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const rawPublicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL;

const defaultApiBaseUrl = import.meta.env.PROD
  ? "https://atukosice.sk"
  : "http://127.0.0.1:8000";

const defaultPublicSiteUrl = import.meta.env.PROD
  ? "https://atukosice.sk"
  : "http://localhost:3000";

export const API_BASE_URL =
  rawApiBaseUrl === undefined || rawApiBaseUrl === null
    ? defaultApiBaseUrl
    : rawApiBaseUrl.replace(/\/$/, "");

export const ADMIN_API_PREFIX = "/api/admin";

export const PUBLIC_SITE_URL =
  rawPublicSiteUrl === undefined || rawPublicSiteUrl === null
    ? defaultPublicSiteUrl
    : rawPublicSiteUrl.replace(/\/$/, "");

function assertSafeProductionUrl(name: string, value: string) {
  if (!import.meta.env.PROD || value === "") {
    return;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} musí byť platná absolútna URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${name} musí v produkcii používať HTTPS.`);
  }

  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
    throw new Error(`${name} nesmie v produkcii smerovať na localhost.`);
  }
}

assertSafeProductionUrl("VITE_API_BASE_URL", API_BASE_URL);
assertSafeProductionUrl("VITE_PUBLIC_SITE_URL", PUBLIC_SITE_URL);

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (API_BASE_URL === "") {
    return normalizedPath;
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export function getPublicPageUrl(publicPath: string) {
  if (/^https?:\/\//i.test(publicPath)) {
    return publicPath;
  }

  const normalizedPath = publicPath.startsWith("/")
    ? publicPath
    : `/${publicPath}`;

  if (normalizedPath === "/") {
    return `${PUBLIC_SITE_URL}/`;
  }

  return `${PUBLIC_SITE_URL}${normalizedPath}`;
}
