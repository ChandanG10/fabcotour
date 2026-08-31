import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool, withTransaction } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";
import { slugify } from "../../utils/slug.js";

const categorySchema = z.object({
  parentId: z.string().min(1).nullable().optional(),
  name: z.string().trim().min(2),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  audience: z.enum(["men", "women", "kids", "unisex", "business"]).default("unisex"),
  imageUrl: z.string().url().nullable().optional(),
  imagePublicId: z.string().nullable().optional(),
  isVisible: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).max(100000).default(0)
});
const statusSchema = z.object({ isVisible: z.boolean() });
const reorderSchema = z.object({ items: z.array(z.object({ id: z.string().uuid(), displayOrder: z.coerce.number().int().min(0).max(100000) })).min(1).max(200) });

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
    productCount: Number((row as CategoryRow & { product_count?: number }).product_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function categoryById(id: string) {
  const [rows] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE id=? AND deleted_at IS NULL LIMIT 1", [id]);
  if (!rows[0]) throw new HttpError(404, "Category not found.");
  return rows[0];
}

async function assertUniqueSlug(parentId: string | null, slug: string, excludeId?: string) {
  const params: unknown[] = [slug, parentId, parentId];
  let sql = "SELECT id FROM categories WHERE slug=? AND ((parent_id IS NULL AND ? IS NULL) OR parent_id=?) AND deleted_at IS NULL";
  if (excludeId) { sql += " AND id<>?"; params.push(excludeId); }
  const [rows] = await pool.query<RowDataPacket[]>(`${sql} LIMIT 1`, params);
  if (rows[0]) throw new HttpError(409, "That slug is already used within this category.");
}

function normalizedSlug(value: string | undefined, name: string) {
  const slug = slugify(value || name);
  if (!slug) throw new HttpError(400, "Enter a valid category slug.");
  return slug;
}

async function validateParent(parentId: string | null, categoryId?: string) {
  if (!parentId) return;
  if (parentId === categoryId) throw new HttpError(400, "A category cannot be its own parent.");
  const parent = await categoryById(parentId);
  if (parent.parent_id) throw new HttpError(400, "Subcategories can only belong to a main category.");
}

export const categoriesRouter = Router();
categoriesRouter.use(requireAdminAuth);

categoriesRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, limit, search } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const searchClause = search ? "AND name LIKE ?" : "";
    const searchValue = search ? [`%${search}%`] : [];

    const [rows] = await pool.query<CategoryRow[]>(
      `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL AND p.subcategory_id=c.id) AS product_count FROM categories c WHERE c.deleted_at IS NULL ${searchClause ? "AND c.name LIKE ?" : ""} ORDER BY c.parent_id IS NOT NULL, c.display_order ASC, c.created_at DESC LIMIT ? OFFSET ?`,
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
    const slug = normalizedSlug(payload.slug, payload.name);

    await validateParent(payload.parentId ?? null);
    await assertUniqueSlug(payload.parentId ?? null, slug);
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
    const slug = normalizedSlug(payload.slug, payload.name);

    await categoryById(String(request.params.id));
    await validateParent(payload.parentId ?? null, String(request.params.id));
    await assertUniqueSlug(payload.parentId ?? null, slug, String(request.params.id));
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
    const category = await categoryById(String(request.params.id));
    const [counts] = await pool.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL AND (category_id=? OR subcategory_id=?)) AS products,
      (SELECT COUNT(*) FROM categories WHERE deleted_at IS NULL AND parent_id=?) AS children`, [category.id, category.id, category.id]);
    if (Number(counts[0]?.products) || Number(counts[0]?.children)) throw new HttpError(409, `This category is assigned to ${Number(counts[0]?.products)} products and has ${Number(counts[0]?.children)} subcategories. Archive it or move its relationships first.`);
    await pool.query("DELETE FROM categories WHERE id = ?", [request.params.id]);
    response.status(204).send();
  })
);

categoriesRouter.get("/:categorySlug/subcategories", asyncHandler(async (request, response) => {
  const [parents] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE slug=? AND parent_id IS NULL AND is_visible=1 AND deleted_at IS NULL LIMIT 1", [request.params.categorySlug]);
  if (!parents[0]) throw new HttpError(404, "Category not found.");
  const [rows] = await pool.query<CategoryRow[]>(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL AND p.is_visible=1 AND p.is_archived=0 AND p.subcategory_id=c.id) AS product_count FROM categories c WHERE c.parent_id=? AND c.is_visible=1 AND c.deleted_at IS NULL ORDER BY c.display_order,c.name`, [parents[0].id]);
  response.json({ items: rows.map(mapCategory) });
}));

categoriesRouter.post("/:categoryId/subcategories", requireAdminAuth, asyncHandler(async (request, response) => {
  const parent = await categoryById(String(request.params.categoryId));
  if (parent.parent_id) throw new HttpError(400, "Choose a main category as the parent.");
  const payload = categorySchema.omit({ parentId: true }).parse({ ...request.body, audience: request.body.audience ?? parent.audience });
  const slug = normalizedSlug(payload.slug, payload.name);
  await assertUniqueSlug(parent.id, slug);
  const id = uuid();
  await pool.query(`INSERT INTO categories (id,parent_id,name,slug,description,audience,image_url,image_public_id,is_visible,display_order) VALUES (?,?,?,?,?,?,?,?,?,?)`, [id,parent.id,payload.name,slug,payload.description ?? null,parent.audience,payload.imageUrl ?? null,payload.imagePublicId ?? null,payload.isVisible ? 1 : 0,payload.displayOrder]);
  const [rows] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE id=?", [id]);
  response.status(201).json({ item: mapCategory(rows[0]) });
}));

export const subcategoriesRouter = Router();
subcategoriesRouter.use(requireAdminAuth);
subcategoriesRouter.put("/:id", asyncHandler(async (request, response) => {
  const current = await categoryById(String(request.params.id));
  if (!current.parent_id) throw new HttpError(400, "This endpoint only edits subcategories.");
  const payload = categorySchema.parse({ ...request.body, parentId: request.body.parentId ?? current.parent_id, audience: request.body.audience ?? current.audience });
  const slug = normalizedSlug(payload.slug, payload.name); await validateParent(payload.parentId ?? current.parent_id, current.id); await assertUniqueSlug(payload.parentId ?? current.parent_id, slug, current.id);
  await pool.query(`UPDATE categories SET parent_id=?,name=?,slug=?,description=?,audience=?,image_url=?,image_public_id=?,is_visible=?,display_order=? WHERE id=?`, [payload.parentId ?? current.parent_id,payload.name,slug,payload.description ?? null,payload.audience,payload.imageUrl ?? null,payload.imagePublicId ?? null,payload.isVisible ? 1 : 0,payload.displayOrder,current.id]);
  const [rows] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE id=?", [current.id]); response.json({ item: mapCategory(rows[0]) });
}));
subcategoriesRouter.patch("/:id/status", asyncHandler(async (request, response) => {
  const current = await categoryById(String(request.params.id)); if (!current.parent_id) throw new HttpError(400, "This endpoint only updates subcategories.");
  const payload = statusSchema.parse(request.body); await pool.query("UPDATE categories SET is_visible=? WHERE id=?", [payload.isVisible ? 1 : 0,current.id]); response.json({ item: { ...mapCategory(current), isVisible: payload.isVisible } });
}));
subcategoriesRouter.patch("/reorder", asyncHandler(async (request, response) => {
  const payload = reorderSchema.parse(request.body);
  for (const item of payload.items) await pool.query("UPDATE categories SET display_order=? WHERE id=? AND parent_id IS NOT NULL AND deleted_at IS NULL", [item.displayOrder,item.id]);
  response.json({ success: true });
}));
subcategoriesRouter.patch("/:id/move-products", asyncHandler(async (request, response) => {
  const current = await categoryById(String(request.params.id));
  if (!current.parent_id) throw new HttpError(400, "This endpoint only moves subcategory products.");
  const payload = z.object({ targetSubcategoryId: z.string().uuid() }).parse(request.body);
  if (payload.targetSubcategoryId === current.id) throw new HttpError(400, "Choose a different destination subcategory.");
  const target = await categoryById(payload.targetSubcategoryId);
  if (target.parent_id !== current.parent_id) throw new HttpError(400, "Products can only be moved to a subcategory under the same main category.");
  if (!target.is_visible) throw new HttpError(400, "Choose an active destination subcategory.");
  await withTransaction(async (connection) => {
    await connection.query("UPDATE products SET subcategory_id=?, subcategory_review_required=0 WHERE subcategory_id=? AND deleted_at IS NULL", [target.id, current.id]);
    await connection.query("DELETE FROM categories WHERE id=?", [current.id]);
  });
  response.json({ success: true });
}));
subcategoriesRouter.delete("/:id", asyncHandler(async (request, response) => {
  const current = await categoryById(String(request.params.id)); if (!current.parent_id) throw new HttpError(400, "This endpoint only deletes subcategories.");
  const [counts] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) total FROM products WHERE subcategory_id=? AND deleted_at IS NULL", [current.id]); const total=Number(counts[0]?.total ?? 0);
  if (total) throw new HttpError(409, `This subcategory is assigned to ${total} products.`, { productCount: total });
  await pool.query("DELETE FROM categories WHERE id=?", [current.id]); response.status(204).send();
}));

export const publicCategoriesRouter = Router();
publicCategoriesRouter.get("/", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<CategoryRow[]>(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL AND p.is_visible=1 AND p.is_archived=0 AND p.subcategory_id=c.id) AS product_count
     FROM categories c
     WHERE c.deleted_at IS NULL AND c.is_visible=1
     ORDER BY c.parent_id IS NOT NULL, c.display_order, c.name`
  );
  response.json({ items: rows.map(mapCategory) });
}));
publicCategoriesRouter.get("/:categorySlug/subcategories", asyncHandler(async (request, response) => {
  const [parents] = await pool.query<CategoryRow[]>("SELECT * FROM categories WHERE slug=? AND parent_id IS NULL AND is_visible=1 AND deleted_at IS NULL LIMIT 1", [request.params.categorySlug]);
  if (!parents[0]) throw new HttpError(404, "Category not found.");
  const [rows] = await pool.query<CategoryRow[]>(
    `SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.deleted_at IS NULL AND p.is_visible=1 AND p.is_archived=0 AND p.subcategory_id=c.id) AS product_count
     FROM categories c WHERE c.parent_id=? AND c.is_visible=1 AND c.deleted_at IS NULL ORDER BY c.display_order,c.name`,
    [parents[0].id]
  );
  response.json({ items: rows.map(mapCategory) });
}));
