const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, "");

const deriveServerBaseUrl = (apiBaseUrl: string) => {
  const trimmed = trimTrailingSlashes(apiBaseUrl);
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
};

export const API_BASE_URL = trimTrailingSlashes(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
);

export const SERVER_BASE_URL = trimTrailingSlashes(
  process.env.NEXT_PUBLIC_SERVER_URL || deriveServerBaseUrl(API_BASE_URL),
);

export const SOCKET_URL = trimTrailingSlashes(
  process.env.NEXT_PUBLIC_SOCKET_URL || SERVER_BASE_URL,
);

export const buildAssetUrl = (path?: string | null) => {
  if (!path) return null;

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${SERVER_BASE_URL}${normalizedPath}`;
};
