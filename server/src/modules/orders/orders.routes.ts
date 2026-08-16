import { Router } from "express";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";

const orderUpdateSchema = z.object({
  status: z.enum(["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"]).optional(),
  paymentStatus: z.enum(["Pending", "Paid", "Failed", "Refunded"]).optional(),
  trackingNumber: z.string().nullable().optional()
});

export const ordersRouter = Router();

ordersRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    const [countRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM orders WHERE deleted_at IS NULL");
    response.json({ items: rows, meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit) });
  })
);

ordersRouter.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = orderUpdateSchema.parse(request.body);
    await pool.query(
      `UPDATE orders
       SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status), tracking_number = ?
       WHERE id = ?`,
      [payload.status ?? null, payload.paymentStatus ?? null, payload.trackingNumber ?? null, request.params.id]
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM orders WHERE id = ?", [request.params.id]);
    response.json({ item: rows[0] });
  })
);
