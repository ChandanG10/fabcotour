import cookieParser from "cookie-parser";
import cors, { type CorsOptions } from "cors";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pool } from "./db/pool.js";
import { env, isProduction } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { categoriesRouter, publicCategoriesRouter, subcategoriesRouter } from "./modules/categories/categories.routes.js";
import { couponsRouter } from "./modules/coupons/coupons.routes.js";
import { customersRouter } from "./modules/customers/customers.routes.js";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes.js";
import { enquiriesRouter } from "./modules/enquiries/enquiries.routes.js";
import { homepageRouter } from "./modules/homepage/homepage.routes.js";
import { ordersRouter } from "./modules/orders/orders.routes.js";
import { productsRouter, storeProductsRouter } from "./modules/products/products.routes.js";
import { reviewsRouter } from "./modules/reviews/reviews.routes.js";
import { storeRouter } from "./modules/store/store.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { adminCustomisationRouter, customisationRouter } from "./modules/customisation/customisation.routes.js";

export const productionOrigins = Array.from(
  new Set(
    ["https://fabpodd.com", "https://www.fabpodd.com", env.APP_ORIGIN]
      .filter((origin): origin is string => Boolean(origin))
      .map((origin) => origin.replace(/\/+$/, ""))
  )
);

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) {
    return true;
  }

  if (productionOrigins.includes(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      !isProduction &&
      (url.protocol === "http:" || url.protocol === "https:") &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    console.error(`Blocked CORS origin: ${origin}`);
    callback(new Error("Origin is not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 204
};

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("etag");
  app.use((_request, response, next) => {
    // CORS varies by request Origin. Do not let browsers or Vercel reuse a
    // response (and its Access-Control-Allow-Origin value) for another origin.
    response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.setHeader("CDN-Cache-Control", "no-store");
    response.setHeader("Vercel-CDN-Cache-Control", "no-store");
    response.setHeader("Pragma", "no-cache");
    response.setHeader("Expires", "0");
    next();
  });
  app.options(/.*/, cors(corsOptions));
  app.use(cors(corsOptions));
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
    try {
      await pool.query("SELECT 1");
      response.json({
        success: true,
        message: "Fabcoutour API is running"
      });
    } catch (error) {
      const databaseCode =
        typeof error === "object" && error !== null && "code" in error
          ? String(error.code)
          : "DB_UNAVAILABLE";

      console.error("Database health check failed", { code: databaseCode });
      response.status(503).json({
        success: false,
        message: "Database is unavailable.",
        code: databaseCode
      });
    }
  });

  app.use("/api/admin/auth", authRouter);
  app.use("/api/admin/dashboard", dashboardRouter);
  app.use("/api/admin/products", productsRouter);
  app.use("/api/admin/categories", categoriesRouter);
  app.use("/api/admin/subcategories", subcategoriesRouter);
  app.use("/api/admin/homepage", homepageRouter);
  app.use("/api/admin/orders", ordersRouter);
  app.use("/api/admin/customers", customersRouter);
  app.use("/api/admin/coupons", couponsRouter);
  app.use("/api/admin/reviews", reviewsRouter);
  app.use("/api/admin/enquiries", enquiriesRouter);
  app.use("/api/admin/uploads", uploadsRouter);
  app.use("/api/admin/customisation", adminCustomisationRouter);
  app.use("/api/customisation", customisationRouter);
  app.use("/api/store", storeRouter);
  app.use("/api/categories", publicCategoriesRouter);
  app.use("/api/products", storeProductsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
