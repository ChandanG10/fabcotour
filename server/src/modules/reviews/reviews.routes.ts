import { Router } from "express";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";

export const reviewsRouter = Router();

reviewsRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const { page, limit } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT * FROM reviews WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    const [countRows] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM reviews WHERE deleted_at IS NULL");
    response.json({ items: rows, meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit) });
  })
);

reviewsRouter.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const schema = z.object({ isApproved: z.boolean() });
    const payload = schema.parse(request.body);
    await pool.query("UPDATE reviews SET is_approved = ? WHERE id = ?", [payload.isApproved ? 1 : 0, request.params.id]);
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM reviews WHERE id = ?", [request.params.id]);
    response.json({ item: rows[0] });
  })
);
