import { Router } from "express";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";

const statusSchema = z.object({
  status: z.string().min(2)
});

export const enquiriesRouter = Router();

enquiriesRouter.get(
  "/corporate",
  requireAdminAuth,
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM corporate_enquiries ORDER BY created_at DESC");
    response.json({ items: rows });
  })
);

enquiriesRouter.put(
  "/corporate/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = statusSchema.parse(request.body);
    await pool.query("UPDATE corporate_enquiries SET status = ? WHERE id = ?", [payload.status, request.params.id]);
    response.json({ success: true });
  })
);

enquiriesRouter.get(
  "/bulk",
  requireAdminAuth,
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM bulk_enquiries ORDER BY created_at DESC");
    response.json({ items: rows });
  })
);

enquiriesRouter.put(
  "/bulk/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = statusSchema.parse(request.body);
    await pool.query("UPDATE bulk_enquiries SET status = ? WHERE id = ?", [payload.status, request.params.id]);
    response.json({ success: true });
  })
);

enquiriesRouter.get(
  "/contact",
  requireAdminAuth,
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM contact_enquiries ORDER BY created_at DESC");
    response.json({ items: rows });
  })
);

enquiriesRouter.put(
  "/contact/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = statusSchema.parse(request.body);
    await pool.query("UPDATE contact_enquiries SET status = ? WHERE id = ?", [payload.status, request.params.id]);
    response.json({ success: true });
  })
);
