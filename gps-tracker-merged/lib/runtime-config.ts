const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

/**
 * Derive the server base URL from the API URL by removing the /api suffix.
 * Used as a fallback if NEXT_PUBLIC_SERVER_URL is not explicitly provided.
 */
const deriveServerBaseUrl = (apiBaseUrl: string) => {
  const trimmed = trimTrailingSlashes(apiBaseUrl);
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

// --- API Configuration ---

// Base URL for API calls
export const API_BASE_URL = trimTrailingSlashes(
  process.env.NEXT_PUBLIC_API_URL || ""
);

// Base URL for the server (used for assets, etc.)
export const SERVER_BASE_URL = trimTrailingSlashes(
  process.env.NEXT_PUBLIC_SERVER_URL || deriveServerBaseUrl(API_BASE_URL)
);

// Base URL for Socket.io connection
export const SOCKET_URL = trimTrailingSlashes(
  process.env.NEXT_PUBLIC_SOCKET_URL || SERVER_BASE_URL
);

// Validation for production
if (process.env.NODE_ENV === "production") {
  if (!API_BASE_URL) {
    console.error("CRITICAL: NEXT_PUBLIC_API_URL is not defined in production environment!");
  }
} else {
  // Development fallbacks if .env is missing or variables are empty
  if (!API_BASE_URL) {
    console.warn("WARNING: NEXT_PUBLIC_API_URL is missing. Falling back to localhost for development.");
  }
}

/**
 * Builds a full URL for an asset path.
 * Handles both absolute URLs and relative paths.
 */
export const buildAssetUrl = (path?: string | null) => {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  
  // Use a sensible default if SERVER_BASE_URL is missing
  const baseUrl = SERVER_BASE_URL || "http://localhost:5000";
  return `${baseUrl}${normalizedPath}`;
};
