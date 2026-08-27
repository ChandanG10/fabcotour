const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const configuredProductionApiBaseUrl = import.meta.env.VITE_PRODUCTION_API_BASE_URL?.trim();
const fabCoutureProductionApiBaseUrl = "https://fabcotour.vercel.app/api";
const isLocalHostname =
  typeof window !== "undefined" &&
  ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);

function isLocalApiBaseUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /^https?:\/\/(localhost|127\.0\.0\.1|::1)(:\d+)?\/?/i.test(value);
}

function resolveApiBaseUrl() {
  if (isLocalHostname) {
    return configuredApiBaseUrl || "http://localhost:8787/api";
  }

  if (configuredProductionApiBaseUrl) {
    return configuredProductionApiBaseUrl;
  }

  if (configuredApiBaseUrl && !isLocalApiBaseUrl(configuredApiBaseUrl)) {
    return configuredApiBaseUrl;
  }

  if (
    typeof window !== "undefined" &&
    ["fabpodd.com", "www.fabpodd.com"].includes(window.location.hostname)
  ) {
    return fabCoutureProductionApiBaseUrl;
  }

  return "/api";
}

const rawApiBaseUrl = resolveApiBaseUrl();

export const apiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : `Request failed with status ${response.status}.`;
    const details =
      typeof payload === "object" && payload && "details" in payload
        ? (payload as { details?: unknown }).details
        : undefined;
    throw new ApiError(response.status, message, details);
  }

  if (!contentType.includes("application/json")) {
    throw new ApiError(
      502,
      "The API returned a non-JSON response. Check the production API URL or reverse-proxy configuration."
    );
  }

  return payload as T;
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : `Upload failed with status ${response.status}.`;
    const details =
      typeof payload === "object" && payload && "details" in payload
        ? (payload as { details?: unknown }).details
        : undefined;
    throw new ApiError(response.status, message, details);
  }

  return payload as T;
}
