const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();

const isLocalHostname = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1" ||
  /^10\./.test(hostname) ||
  /^192\.168\./.test(hostname) ||
  /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);

const localApiBaseUrl =
  typeof window !== "undefined" && isLocalHostname(window.location.hostname)
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : "";

export const API_BASE_URL = (configuredApiBaseUrl || localApiBaseUrl).replace(/\/+$/, "");

export const API_CONFIGURATION_MESSAGE =
  "The online analysis service is not configured for this site. Set NEXT_PUBLIC_API_BASE_URL in Netlify to the HTTPS URL of the deployed FastAPI service, then redeploy.";

export function apiUrl(path: string) {
  if (!API_BASE_URL) {
    throw new Error(API_CONFIGURATION_MESSAGE);
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
