import cors, { type CorsOptions } from "cors";
import type { Express, RequestHandler } from "express";

const requiredFrontendOrigins = [
  "https://fabpodd.com",
  "https://www.fabpodd.com",
  "http://localhost:5173"
] as const;

function normalizeOrigin(origin: string) {
  try {
    return new URL(origin).origin;
  } catch {
    return origin.replace(/\/+$/, "");
  }
}

export function createAllowedOrigins() {
  return new Set(
    requiredFrontendOrigins.map(normalizeOrigin)
  );
}

export function isAllowedOrigin(origin: string | undefined, allowedOrigins: ReadonlySet<string>) {
  // Requests without an Origin header include server-to-server traffic and
  // provider callbacks such as PayU. CORS is a browser-origin policy.
  return !origin || allowedOrigins.has(normalizeOrigin(origin));
}

export function createCorsOptions(allowedOrigins: ReadonlySet<string>): CorsOptions {
  return {
    origin(origin, callback) {
      callback(null, isAllowedOrigin(origin, allowedOrigins));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    optionsSuccessStatus: 204,
    maxAge: 600
  };
}

export function rejectDisallowedOrigins(allowedOrigins: ReadonlySet<string>): RequestHandler {
  return (request, response, next) => {
    const origin = request.get("Origin");
    if (origin && !isAllowedOrigin(origin, allowedOrigins)) {
      console.warn("Blocked CORS origin", { origin, method: request.method, path: request.originalUrl });
      response.status(403).json({ message: "Origin is not allowed by CORS." });
      return;
    }
    next();
  };
}

export function configureCors(app: Express) {
  const allowedOrigins = createAllowedOrigins();
  const options = createCorsOptions(allowedOrigins);

  // Keep the origin guard and preflight responder ahead of every parser,
  // authentication middleware, rate limiter, and API route.
  app.use(rejectDisallowedOrigins(allowedOrigins));
  app.options(/.*/, cors(options));
  app.use(cors(options));
}

