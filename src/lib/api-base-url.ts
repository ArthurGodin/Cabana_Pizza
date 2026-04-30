const LOCAL_API_PORT = "8000";
const DEFAULT_API_BASE_URL = `http://127.0.0.1:${LOCAL_API_PORT}`;

export function getApiBaseUrl() {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL;

  if (configuredUrl) {
    return stripTrailingSlash(configuredUrl);
  }

  if (typeof window === "undefined") {
    return DEFAULT_API_BASE_URL;
  }

  const { protocol, hostname } = window.location;

  if (isLoopbackHost(hostname)) {
    return DEFAULT_API_BASE_URL;
  }

  return `${protocol}//${hostname}:${LOCAL_API_PORT}`;
}

function isLoopbackHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
