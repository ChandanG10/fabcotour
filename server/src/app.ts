import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoriesRouter } from "./modules/categories/categories.routes.js";
import { couponsRouter } from "./modules/coupons/coupons.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { enquiriesRouter } from "./modules/enquiries/enquiries.routes.js";
import { homepageRouter } from "./modules/homepage/homepage.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { reviewsRouter } from "./modules/reviews/reviews.routes.js";
import { storeRouter } from "./modules/store/store.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";

const localhostOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174"
]);

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

function getConfiguredOrigins() {
  return env.APP_ORIGIN.split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean);
}

function isAllowedOrigin(origin: string) {
  const normalizedOrigin = normalizeOrigin(origin);
  const configuredOrigins = getConfiguredOrigins();

  if (configuredOrigins.includes(normalizedOrigin)) {
    return true;
  }

  if (localhostOrigins.has(normalizedOrigin)) {
    return true;
  }

  try {
    const { hostname, protocol } = new URL(normalizedOrigin);
    if ((protocol === "https:" || protocol === "http:") && hostname.endsWith(".vercel.app")) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS.`));
      },
      credentials: true
    })
  );
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.get("/", (_request, response) => {
    response.json({
      success: true,
      message: "Fabcoutour API is running"
    });
  });

  app.get("/api/health", async (_request, response) => {
    await pool.query("SELECT 1");
    response.json({
      success: true,
      message: "Fabcoutour API is running"
    });
  });

  app.use("/api/admin/auth", authRouter);
  app.use("/api/admin/dashboard", dashboardRouter);
  app.use("/api/admin/products", productsRouter);
  app.use("/api/admin/categories", categoriesRouter);
  app.use("/api/admin/homepage", homepageRouter);
  app.use("/api/admin/orders", ordersRouter);
  app.use("/api/admin/customers", customersRouter);
  app.use("/api/admin/coupons", couponsRouter);
  app.use("/api/admin/reviews", reviewsRouter);
  app.use("/api/admin/enquiries", enquiriesRouter);
  app.use("/api/admin/uploads", uploadsRouter);
  app.use("/api/store", storeRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
