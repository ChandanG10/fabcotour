import { Router } from "express";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { withTransaction } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";
import { parseJsonValue } from "../../utils/json.js";

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
    const orderIds = rows.map((row) => row.id);
    let itemRows: RowDataPacket[] = [];
    if (orderIds.length) {
      [itemRows] = await pool.query<RowDataPacket[]>(
        `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => "?").join(",")}) ORDER BY created_at`,
        orderIds
      );
    }
    const items = rows.map((row) => ({
      ...row,
      shipping_address: parseJsonValue(row.shipping_address, null),
      items: itemRows
        .filter((item) => item.order_id === row.id)
        .map((item) => ({ ...item, customization: parseJsonValue(item.customization, null) }))
    }));
    response.json({ items, meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit) });
  })
);

ordersRouter.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = orderUpdateSchema.parse(request.body);
    await withTransaction(async (connection) => {
      const [orders] = await connection.query<RowDataPacket[]>(
        "SELECT * FROM orders WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE",
        [request.params.id]
      );
      const order = orders[0];
      if (!order) throw new HttpError(404, "Order not found.");

      if (payload.status && payload.status !== order.status) {
        const allowedTransitions: Record<string, string[]> = {
          Pending: ["Confirmed", "Cancelled"],
          Confirmed: ["Processing", "Cancelled"],
          Processing: ["Shipped", "Cancelled"],
          Shipped: ["Delivered", "Returned"],
          Delivered: ["Returned"],
          Cancelled: [], Returned: []
        };
        if (!allowedTransitions[String(order.status)]?.includes(payload.status)) {
          throw new HttpError(409, `Order cannot move from ${String(order.status)} to ${payload.status}.`);
        }

        if (payload.status === "Cancelled" && order.stock_committed_at) {
          const [items] = await connection.query<RowDataPacket[]>("SELECT * FROM order_items WHERE order_id = ?", [order.id]);
          for (const item of items) {
            if (item.variant_id) {
              await connection.query("UPDATE product_variants SET stock = stock + ? WHERE id = ?", [item.quantity, item.variant_id]);
              await connection.query("UPDATE inventory SET quantity = quantity + ? WHERE variant_id = ?", [item.quantity, item.variant_id]);
            }
            if (item.product_id) {
              await connection.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
              if (!item.variant_id) {
                await connection.query("UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND variant_id IS NULL", [item.quantity, item.product_id]);
              }
            }
          }
          await connection.query("UPDATE orders SET stock_committed_at = NULL WHERE id = ?", [order.id]);
        }
      }

      await connection.query(
        `UPDATE orders SET status = COALESCE(?, status), payment_status = COALESCE(?, payment_status),
         tracking_number = CASE WHEN ? = 1 THEN ? ELSE tracking_number END WHERE id = ?`,
        [payload.status ?? null, payload.paymentStatus ?? null,
          payload.trackingNumber !== undefined ? 1 : 0, payload.trackingNumber ?? null, request.params.id]
      );
    });
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM orders WHERE id = ?", [request.params.id]);
    response.json({ item: rows[0] });
  })
);
