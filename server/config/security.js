const normalizeOrigin = (value) => {
  if (!value) return null;

  try {
    return new URL(String(value).trim()).origin;
  } catch (_) {
    return null;
  }
};

const buildAllowedOrigins = () => {
  const configuredOrigins = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXT_PUBLIC_FRONTEND_URL,
    ...(process.env.CORS_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ];

  const developmentOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
  ];

  const origins = new Set();
  const includeDevelopmentOrigins =
    process.env.NODE_ENV !== "production" || configuredOrigins.length === 0;

  [
    ...(includeDevelopmentOrigins ? developmentOrigins : []),
    ...configuredOrigins,
  ].forEach((origin) => {
    const normalized = normalizeOrigin(origin);
    if (normalized) {
      origins.add(normalized);
    }
  });

  return origins;
};

const allowedOrigins = buildAllowedOrigins();

const isOriginAllowed = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) return false;

  if (allowedOrigins.size === 0) {
    return true;
  }

  return allowedOrigins.has(normalizedOrigin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

module.exports = {
  allowedOrigins,
  corsOptions,
  isOriginAllowed,
  normalizeOrigin,
};
