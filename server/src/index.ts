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

const app = express();

app.use(
  cors({
    origin: env.APP_ORIGIN,
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

app.get("/api/health", async (_request, response) => {
  await pool.query("SELECT 1");
  response.json({ status: "ok" });
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

app.listen(env.SERVER_PORT, () => {
  console.log(`FAB COUTURE server running on port ${env.SERVER_PORT}`);
});
