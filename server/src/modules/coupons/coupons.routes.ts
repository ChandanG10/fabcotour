import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";

const couponSchema = z.object({
  code: z.string().min(2),
  description: z.string().nullable().optional(),
  discountType: z.enum(["flat", "percentage"]),
  value: z.number().nonnegative(),
  minimumOrderValue: z.number().nonnegative().default(0),
  maximumDiscount: z.number().nonnegative().nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  usageLimit: z.number().int().positive().nullable().optional(),
  isActive: z.boolean().default(true)
});

export const couponsRouter = Router();

couponsRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM coupons WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [countRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM coupons WHERE deleted_at IS NULL");
    response.json({ items: rows, meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit) });
  })
);

couponsRouter.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = couponSchema.parse(request.body);
    const id = uuid();
    await pool.query(
      `INSERT INTO coupons (
        id, code, description, discount_type, value, minimum_order_value, maximum_discount, starts_at, ends_at, usage_limit, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.code.toUpperCase(),
        payload.description ?? null,
        payload.discountType,
        payload.value,
        payload.minimumOrderValue,
        payload.maximumDiscount ?? null,
        payload.startsAt ?? null,
        payload.endsAt ?? null,
        payload.usageLimit ?? null,
        payload.isActive ? 1 : 0
      ]
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM coupons WHERE id = ?", [id]);
    response.status(201).json({ item: rows[0] });
  })
);

couponsRouter.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = couponSchema.parse(request.body);
    await pool.query(
      `UPDATE coupons
       SET code = ?, description = ?, discount_type = ?, value = ?, minimum_order_value = ?, maximum_discount = ?, starts_at = ?, ends_at = ?, usage_limit = ?, is_active = ?
       WHERE id = ?`,
      [
        payload.code.toUpperCase(),
        payload.description ?? null,
        payload.discountType,
        payload.value,
        payload.minimumOrderValue,
        payload.maximumDiscount ?? null,
        payload.startsAt ?? null,
        payload.endsAt ?? null,
        payload.usageLimit ?? null,
        payload.isActive ? 1 : 0,
        request.params.id
      ]
    );
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM coupons WHERE id = ?", [request.params.id]);
    response.json({ item: rows[0] });
  })
);

couponsRouter.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    await pool.query("UPDATE coupons SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [request.params.id]);
    response.status(204).send();
  })
);
