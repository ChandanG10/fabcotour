import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";
import { slugify } from "../../utils/slug.js";

const categorySchema = z.object({
  parentId: z.string().min(1).nullable().optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  audience: z.enum(["men", "women", "kids", "unisex", "business"]).default("unisex"),
  imageUrl: z.string().url().nullable().optional(),
  imagePublicId: z.string().nullable().optional(),
  isVisible: z.boolean().default(true),
  displayOrder: z.number().int().default(0)
});

interface CategoryRow extends RowDataPacket {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  audience: "men" | "women" | "kids" | "unisex" | "business";
  image_url: string | null;
  image_public_id: string | null;
  is_visible: number;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow) {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    audience: row.audience,
    imageUrl: row.image_url,
    imagePublicId: row.image_public_id,
    isVisible: Boolean(row.is_visible),
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, limit, search } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const searchClause = search ? "AND name LIKE ?" : "";
    const searchValue = search ? [`%${search}%`] : [];

    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT * FROM categories WHERE deleted_at IS NULL ${searchClause} ORDER BY display_order ASC, created_at DESC LIMIT ? OFFSET ?`,
      [...searchValue, limit, offset]
    );
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM categories WHERE deleted_at IS NULL ${searchClause}`,
      searchValue
    );

    response.json({
      items: rows.map(mapCategory),
      meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit)
    });
  })
);

categoriesRouter.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = categorySchema.parse(request.body);
    const id = uuid();
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

    await pool.query(
      `INSERT INTO categories (
        id, parent_id, name, slug, description, audience, image_url, image_public_id, is_visible, display_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        payload.parentId ?? null,
        payload.name,
        slug,
        payload.description ?? null,
        payload.audience,
        payload.imageUrl ?? null,
        payload.imagePublicId ?? null,
        payload.isVisible ? 1 : 0,
        payload.displayOrder
      ]
    );

    const [rows] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE id = ?", [id]);
    response.status(201).json({ item: mapCategory(rows[0]) });
  })
);

categoriesRouter.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = categorySchema.parse(request.body);
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

    await pool.query(
      `UPDATE categories
       SET parent_id = ?, name = ?, slug = ?, description = ?, audience = ?, image_url = ?, image_public_id = ?, is_visible = ?, display_order = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        payload.parentId ?? null,
        payload.name,
        slug,
        payload.description ?? null,
        payload.audience,
        payload.imageUrl ?? null,
        payload.imagePublicId ?? null,
        payload.isVisible ? 1 : 0,
        payload.displayOrder,
        request.params.id
      ]
    );

    const [rows] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE id = ?", [request.params.id]);
    response.json({ item: mapCategory(rows[0]) });
  })
);

categoriesRouter.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    await pool.query("UPDATE categories SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [request.params.id]);
    response.status(204).send();
  })
);
