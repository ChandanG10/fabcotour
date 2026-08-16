import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";

export const dashboardRouter = Router();

dashboardRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (_request, response) => {
    const [[productStats]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM products WHERE deleted_at IS NULL");
    const [[orderStats]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total, COALESCE(SUM(total_amount), 0) AS revenue FROM orders WHERE deleted_at IS NULL");
    const [[customerStats]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL");
    const [recentOrders] = await pool.query<RowDataPacket[]>(
      "SELECT id, order_number, customer_name, status, total_amount, created_at FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 5"
    );
    const [lowStockProducts] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, sku, stock FROM products WHERE deleted_at IS NULL AND stock <= 5 ORDER BY stock ASC, updated_at DESC LIMIT 8`
    );
    const [salesChart] = await pool.query<RowDataPacket[]>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COALESCE(SUM(total_amount), 0) AS revenue
       FROM orders WHERE deleted_at IS NULL GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC LIMIT 12`
    );

    response.json({
      stats: {
        products: Number(productStats?.total ?? 0),
        orders: Number(orderStats?.total ?? 0),
        customers: Number(customerStats?.total ?? 0),
        revenue: Number(orderStats?.revenue ?? 0)
      },
      recentOrders,
      lowStockProducts,
      salesChart
    });
  })
);
