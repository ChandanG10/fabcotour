import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";

export const customersRouter = Router();

customersRouter.get(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const { page, limit, search } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const where = search ? "deleted_at IS NULL AND (first_name LIKE ? OR email LIKE ?)" : "deleted_at IS NULL";
    const params = search ? [`%${search}%`, `%${search}%`] : [];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM users WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM users WHERE ${where}`,
      params
    );
    response.json({ items: rows, meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit) });
  })
);
