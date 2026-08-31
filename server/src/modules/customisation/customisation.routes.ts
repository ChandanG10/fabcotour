import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { RowDataPacket } from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { pool, withTransaction } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { parseJsonValue } from "../../utils/json.js";
import { slugify } from "../../utils/slug.js";
import { upload } from "../../utils/upload.js";
import { uploadImageToCloudinary } from "../uploads/uploads.service.js";

const sideSchema = z.enum(["front", "back", "right", "left"]);
const vector3Schema = z.tuple([z.coerce.number(), z.coerce.number(), z.coerce.number()]);
const artworkMappingSchema = z.object({
  position: vector3Schema,
  rotation: vector3Schema,
  size: z.tuple([z.coerce.number().positive(), z.coerce.number().positive()])
});
const nullableMoney = z.coerce.number().min(0).max(1_000_000).default(0);
const normalizedRectSchema = z.object({
  x: z.coerce.number().min(0).max(1), y: z.coerce.number().min(0).max(1),
  width: z.coerce.number().positive().max(1), height: z.coerce.number().positive().max(1)
}).superRefine((area, context) => {
  if (area.x + area.width > 1.000001 || area.y + area.height > 1.000001) context.addIssue({ code: z.ZodIssueCode.custom, message: "A normalized area must remain inside the image." });
});
const normalizedPointSchema = z.object({ x: z.coerce.number().min(0).max(1), y: z.coerce.number().min(0).max(1) });
const printAreaSchema = z.object({
  id: z.string().uuid().optional(),
  colourId: z.string().uuid().nullable().optional(),
  side: sideSchema,
  referenceWidth: z.coerce.number().int().min(1).max(10_000),
  referenceHeight: z.coerce.number().int().min(1).max(10_000),
  x: z.coerce.number().min(0),
  y: z.coerce.number().min(0),
  width: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  defaultArea: normalizedRectSchema.optional(),
  printingAreaMode: z.enum(["fixed", "customer_adjustable"]).default("fixed"),
  safeBoundaryType: z.enum(["rectangle", "polygon", "mask"]).default("rectangle"),
  garmentSafeArea: normalizedRectSchema.default({ x: 0, y: 0, width: 1, height: 1 }),
  garmentSafePolygon: z.array(normalizedPointSchema).max(100).default([]),
  garmentMaskUrl: z.string().max(1000).nullable().optional(),
  safeAreaVersion: z.string().trim().min(1).max(80).default("legacy-1"),
  minWidthNormalized: z.coerce.number().positive().max(1).default(.05),
  minHeightNormalized: z.coerce.number().positive().max(1).default(.05),
  maxWidthNormalized: z.coerce.number().positive().max(1).default(1),
  maxHeightNormalized: z.coerce.number().positive().max(1).default(1),
  allowMove: z.boolean().default(false),
  allowResize: z.boolean().default(false),
  allowCustomAreaSelection: z.boolean().default(false),
  realWidthCm: z.coerce.number().positive().max(200),
  realHeightCm: z.coerce.number().positive().max(200),
  safeMargin: z.coerce.number().min(0).max(100).default(8),
  isActive: z.boolean().default(true)
}).superRefine((area, context) => {
  if (area.x + area.width > area.referenceWidth || area.y + area.height > area.referenceHeight) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "The print area must fit inside the natural image dimensions." });
  }
  if (area.minWidthNormalized > area.maxWidthNormalized || area.minHeightNormalized > area.maxHeightNormalized) context.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum print dimensions cannot exceed maximum dimensions." });
  if (area.safeBoundaryType !== "rectangle" && area.garmentSafePolygon.length < 3) context.addIssue({ code: z.ZodIssueCode.custom, message: "Polygon and mask boundaries require at least three normalized validation points." });
});

const viewSchema = z.object({
  id: z.string().uuid().optional(),
  side: sideSchema,
  imageUrl: z.string().min(1).max(1000),
  publicId: z.string().max(500).nullable().optional(),
  naturalWidth: z.coerce.number().int().min(1).max(10_000),
  naturalHeight: z.coerce.number().int().min(1).max(10_000),
  isPlaceholder: z.boolean().default(false)
});

const colourSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(140).optional(),
  hexCode: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  additionalPrice: nullableMoney,
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
  views: z.array(viewSchema).max(4).default([])
});

const productSchema = z.object({
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(255),
  slug: z.string().trim().max(280).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  specification: z.string().trim().max(160).nullable().optional(),
  basePrice: nullableMoney,
  thumbnailUrl: z.string().max(1000).nullable().optional(),
  modelUrl: z.string().max(1000).nullable().optional(),
  viewerMode: z.enum(["auto", "real3d", "image360"]).default("auto"),
  modelFormat: z.enum(["glb", "gltf", "obj"]).nullable().optional(),
  modelScale: z.coerce.number().positive().max(100).default(1),
  modelPosition: vector3Schema.default([0, 0, 0]),
  modelRotation: vector3Schema.default([0, 0, 0]),
  materialNames: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  modelArtworkMappings: z.object({
    front: artworkMappingSchema.optional(), back: artworkMappingSchema.optional(),
    right: artworkMappingSchema.optional(), left: artworkMappingSchema.optional()
  }).default({}),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPlaceholder: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).default(0),
  sizes: z.array(z.object({ name: z.string().trim().min(1).max(64), additionalPrice: nullableMoney })).min(1).max(30),
  colours: z.array(colourSchema).min(1).max(40),
  printAreas: z.array(printAreaSchema).min(4).max(160),
  printingMethodIds: z.array(z.string().uuid()).min(1).max(20)
}).superRefine((product, context) => {
  if (product.colours.filter((colour) => colour.isDefault).length !== 1) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Exactly one default colour is required.", path: ["colours"] });
  }
  product.colours.forEach((colour, colourIndex) => {
    const sides = new Set(colour.views.map((view) => view.side));
    sideSchema.options.forEach((side) => {
      if (!sides.has(side)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: `A ${side} mockup is required.`, path: ["colours", colourIndex, "views"] });
      }
    });
  });
});

const categorySchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().trim().min(2).max(160),
  slug: z.string().trim().max(180).optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  thumbnailUrl: z.string().max(1000).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

const canvasSideSchema = z.record(z.string(), z.unknown()).nullable();
const priceSchema = z.object({
  customProductId: z.string().uuid(),
  customColourId: z.string().uuid(),
  size: z.string().trim().min(1).max(64),
  quantity: z.coerce.number().int().min(1).max(500),
  printingMethodId: z.string().uuid(),
  usedSides: z.array(sideSchema).max(4),
  canvasJson: z.object({ front: canvasSideSchema, back: canvasSideSchema, right: canvasSideSchema, left: canvasSideSchema })
});

function deriveUsedSides(canvasJson: z.infer<typeof priceSchema>["canvasJson"]) {
  return sideSchema.options.filter((side) => {
    const objects = canvasJson[side]?.objects;
    return Array.isArray(objects) && objects.length > 0;
  });
}

function assertUsedSides(payload: z.infer<typeof priceSchema>) {
  const derived = deriveUsedSides(payload.canvasJson);
  const submitted = [...new Set(payload.usedSides)].sort();
  if (derived.slice().sort().join(",") !== submitted.join(",")) {
    throw new HttpError(400, "Printed sides do not match the submitted canvas content.");
  }
  return derived;
}

function productSummary(row: RowDataPacket) {
  return {
    id: String(row.id), categoryId: String(row.category_id), subcategoryId: row.subcategory_id ? String(row.subcategory_id) : null,
    categoryName: String(row.category_name), subcategoryName: row.subcategory_name ? String(row.subcategory_name) : null,
    name: String(row.name), slug: String(row.slug), description: row.description ? String(row.description) : null,
    specification: row.specification ? String(row.specification) : null, basePrice: Number(row.base_price),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : null, modelUrl: row.model_url ? String(row.model_url) : null,
    viewerMode: row.viewer_mode ? String(row.viewer_mode) : "auto",
    modelFormat: row.model_format ? String(row.model_format) : null,
    modelScale: Number(row.model_scale ?? 1),
    modelPosition: parseJsonValue(row.model_position, [0, 0, 0]),
    modelRotation: parseJsonValue(row.model_rotation, [0, 0, 0]),
    materialNames: parseJsonValue(row.material_names, []),
    modelArtworkMappings: parseJsonValue(row.model_artwork_mappings, {}),
    defaultColourId: row.default_colour_id ? String(row.default_colour_id) : null,
    isActive: Boolean(row.is_active), isFeatured: Boolean(row.is_featured), isPlaceholder: Boolean(row.is_placeholder),
    displayOrder: Number(row.display_order), colourCount: Number(row.colour_count ?? 0)
  };
}

async function fetchProducts(activeOnly: boolean, slug?: string) {
  const clauses = ["p.deleted_at IS NULL", "c.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (activeOnly) clauses.push("p.is_active = 1", "c.is_active = 1");
  if (slug) { clauses.push("p.slug = ?"); params.push(slug); }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.*, c.name AS category_name, sc.name AS subcategory_name,
      (SELECT COUNT(*) FROM custom_product_colours pc WHERE pc.product_id = p.id AND pc.deleted_at IS NULL ${activeOnly ? "AND pc.is_active = 1" : ""}) AS colour_count
     FROM custom_products p
     INNER JOIN custom_categories c ON c.id = p.category_id
     LEFT JOIN custom_categories sc ON sc.id = p.subcategory_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY c.display_order, sc.display_order, p.display_order, p.name`,
    params
  );
  return rows.map(productSummary);
}

async function fetchConfiguration(slug: string, activeOnly = true) {
  const product = (await fetchProducts(activeOnly, slug))[0];
  if (!product) throw new HttpError(404, "Custom product not found.");
  const activeClause = activeOnly ? " AND is_active = 1" : "";
  const [colours] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM custom_product_colours WHERE product_id = ? AND deleted_at IS NULL${activeClause} ORDER BY display_order, name`, [product.id]
  );
  const colourIds = colours.map((row) => row.id);
  const placeholders = colourIds.map(() => "?").join(",") || "''";
  const [views] = await pool.query<RowDataPacket[]>(`SELECT * FROM custom_product_views WHERE colour_id IN (${placeholders}) ORDER BY FIELD(side, 'front','back','right','left')`, colourIds);
  const [sizes] = await pool.query<RowDataPacket[]>(`SELECT * FROM custom_product_sizes WHERE product_id = ?${activeClause} ORDER BY display_order, name`, [product.id]);
  const [areas] = await pool.query<RowDataPacket[]>(`SELECT * FROM custom_print_areas WHERE product_id = ?${activeClause} ORDER BY FIELD(side, 'front','back','right','left')`, [product.id]);
  const [methods] = await pool.query<RowDataPacket[]>(
    `SELECT m.* FROM custom_printing_methods m INNER JOIN custom_product_printing_methods pm ON pm.printing_method_id = m.id
     WHERE pm.product_id = ?${activeOnly ? " AND m.is_active = 1" : ""} ORDER BY m.display_order, m.name`, [product.id]
  );
  return {
    ...product,
    colours: colours.map((colour) => ({
      id: String(colour.id), name: String(colour.name), slug: String(colour.slug), hexCode: String(colour.hex_code),
      additionalPrice: Number(colour.additional_price), isDefault: Boolean(colour.is_default), isActive: Boolean(colour.is_active),
      displayOrder: Number(colour.display_order),
      views: views.filter((view) => view.colour_id === colour.id).map((view) => ({
        id: String(view.id), side: String(view.side), imageUrl: String(view.image_url), publicId: view.public_id ? String(view.public_id) : null,
        naturalWidth: Number(view.natural_width), naturalHeight: Number(view.natural_height), isPlaceholder: Boolean(view.is_placeholder)
      }))
    })),
    sizes: sizes.map((size) => ({ id: String(size.id), name: String(size.name), additionalPrice: Number(size.additional_price), isActive: Boolean(size.is_active) })),
    printAreas: areas.map((area) => ({
      id: String(area.id), colourId: area.colour_id ? String(area.colour_id) : null, side: String(area.side),
      referenceWidth: Number(area.reference_width), referenceHeight: Number(area.reference_height), x: Number(area.x), y: Number(area.y),
      width: Number(area.width), height: Number(area.height), realWidthCm: Number(area.real_width_cm), realHeightCm: Number(area.real_height_cm),
      xPercent: Number(area.x) / Number(area.reference_width) * 100, yPercent: Number(area.y) / Number(area.reference_height) * 100,
      widthPercent: Number(area.width) / Number(area.reference_width) * 100, heightPercent: Number(area.height) / Number(area.reference_height) * 100,
      defaultArea: parseJsonValue(area.default_area, { x: Number(area.x) / Number(area.reference_width), y: Number(area.y) / Number(area.reference_height), width: Number(area.width) / Number(area.reference_width), height: Number(area.height) / Number(area.reference_height) }),
      printingAreaMode: area.printing_area_mode ? String(area.printing_area_mode) : "fixed",
      safeBoundaryType: area.safe_boundary_type ? String(area.safe_boundary_type) : "rectangle",
      garmentSafeArea: parseJsonValue(area.garment_safe_area, { x: 0, y: 0, width: 1, height: 1 }),
      garmentSafePolygon: parseJsonValue(area.garment_safe_polygon, []), garmentMaskUrl: area.garment_mask_url ? String(area.garment_mask_url) : null,
      safeAreaVersion: area.safe_area_version ? String(area.safe_area_version) : "legacy-1",
      minWidthNormalized: Number(area.min_width_normalized ?? .05), minHeightNormalized: Number(area.min_height_normalized ?? .05),
      maxWidthNormalized: Number(area.max_width_normalized ?? 1), maxHeightNormalized: Number(area.max_height_normalized ?? 1),
      allowMove: Boolean(area.allow_move), allowResize: Boolean(area.allow_resize), allowCustomAreaSelection: Boolean(area.allow_custom_area_selection),
      safeMargin: Number(area.safe_margin), isActive: Boolean(area.is_active)
    })),
    printingMethods: methods.map((method) => ({
      id: String(method.id), name: String(method.name), slug: String(method.slug), description: method.description ? String(method.description) : null,
      minimumQuantity: Number(method.minimum_quantity), baseCharge: Number(method.base_charge), chargePerSide: Number(method.charge_per_side), isActive: Boolean(method.is_active)
    }))
  };
}

async function calculatePrice(payload: z.infer<typeof priceSchema>) {
  const usedSides = assertUsedSides(payload);
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.name, p.base_price, p.is_active AS product_active, c.additional_price, c.is_active AS colour_active,
      s.additional_price AS size_price, s.is_active AS size_active, m.name AS method_name, m.minimum_quantity, m.base_charge, m.charge_per_side, m.is_active AS method_active
     FROM custom_products p
     INNER JOIN custom_product_colours c ON c.product_id = p.id AND c.id = ?
     INNER JOIN custom_product_sizes s ON s.product_id = p.id AND s.name = ?
     INNER JOIN custom_product_printing_methods pm ON pm.product_id = p.id
     INNER JOIN custom_printing_methods m ON m.id = pm.printing_method_id AND m.id = ?
     WHERE p.id = ? AND p.deleted_at IS NULL AND c.deleted_at IS NULL LIMIT 1`,
    [payload.customColourId, payload.size, payload.printingMethodId, payload.customProductId]
  );
  const row = rows[0];
  if (!row || !row.product_active || !row.colour_active || !row.size_active || !row.method_active) {
    throw new HttpError(409, "The selected custom product configuration is unavailable.");
  }
  if (payload.quantity < Number(row.minimum_quantity)) throw new HttpError(400, `${String(row.method_name)} requires at least ${Number(row.minimum_quantity)} item(s).`);
  const baseProduct = (Number(row.base_price) + Number(row.size_price)) * payload.quantity;
  const additionalColour = Number(row.additional_price) * payload.quantity;
  const printingBase = usedSides.length ? Number(row.base_charge) : 0;
  const printingSides = Number(row.charge_per_side) * usedSides.length;
  const subtotal = baseProduct + additionalColour + printingBase + printingSides;
  return {
    productName: String(row.name), printingMethod: String(row.method_name), quantity: payload.quantity,
    usedSides, baseProduct, additionalColour, printingBase, printingSides,
    quantityDiscount: 0, taxes: 0, delivery: subtotal >= 999 ? 0 : 99, total: subtotal + (subtotal >= 999 ? 0 : 99)
  };
}

export const customisationRouter = Router();

customisationRouter.get("/categories", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM custom_categories WHERE deleted_at IS NULL AND is_active = 1 ORDER BY parent_id IS NOT NULL, display_order, name`
  );
  response.json({ items: rows.map((row) => ({ id: String(row.id), parentId: row.parent_id ? String(row.parent_id) : null, name: String(row.name), slug: String(row.slug), description: row.description ? String(row.description) : null, displayOrder: Number(row.display_order) })) });
}));

customisationRouter.get("/products", asyncHandler(async (_request, response) => response.json({ items: await fetchProducts(true) })));
customisationRouter.get("/products/:slug", asyncHandler(async (request, response) => {
  const product = (await fetchProducts(true, String(request.params.slug)))[0];
  if (!product) throw new HttpError(404, "Custom product not found.");
  response.json({ item: product });
}));
customisationRouter.get("/products/:slug/configuration", asyncHandler(async (request, response) => response.json({ item: await fetchConfiguration(String(request.params.slug)) })));
customisationRouter.post("/price", asyncHandler(async (request, response) => response.json({ item: await calculatePrice(priceSchema.parse(request.body)) })));
customisationRouter.post("/cart/validate", asyncHandler(async (request, response) => {
  const payload = priceSchema.parse(request.body);
  response.json({ valid: true, pricingBreakdown: await calculatePrice(payload) });
}));

const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
customisationRouter.post("/uploads", uploadLimiter, upload.single("artwork"), asyncHandler(async (request, response) => {
  const file = request.file;
  if (!file) throw new HttpError(400, "Choose a PNG, JPG or WebP image to upload.");
  const uploaded = await uploadImageToCloudinary(file, "fabpodd/customisation-artwork");
  if (uploaded.width && uploaded.height && (uploaded.width > 12_000 || uploaded.height > 12_000)) {
    throw new HttpError(400, "Artwork dimensions must not exceed 12000 × 12000 pixels.");
  }
  const uploadId = uuid();
  await pool.query(
    `INSERT INTO custom_design_uploads (id, original_url, public_id, original_name, mime_type, byte_size, width, height)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [uploadId, uploaded.url, uploaded.publicId, file.originalname.replace(/[^a-zA-Z0-9._ -]/g, "_"), file.mimetype, file.size, uploaded.width ?? null, uploaded.height ?? null]
  );
  response.status(201).json({ item: { id: uploadId, url: uploaded.url, publicId: uploaded.publicId, width: uploaded.width, height: uploaded.height, originalName: file.originalname } });
}));

export const adminCustomisationRouter = Router();
adminCustomisationRouter.use(requireAdminAuth);

adminCustomisationRouter.get("/categories", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM custom_categories WHERE deleted_at IS NULL ORDER BY parent_id IS NOT NULL, display_order, name");
  response.json({ items: rows });
}));
adminCustomisationRouter.post("/categories", asyncHandler(async (request, response) => {
  const payload = categorySchema.parse(request.body); const id = uuid(); const slug = slugify(payload.slug || payload.name);
  await pool.query(`INSERT INTO custom_categories (id, parent_id, name, slug, description, thumbnail_url, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, payload.parentId ?? null, payload.name, slug, payload.description ?? null, payload.thumbnailUrl ?? null, payload.displayOrder, payload.isActive ? 1 : 0]);
  response.status(201).json({ item: { id, ...payload, slug } });
}));
adminCustomisationRouter.put("/categories/:id", asyncHandler(async (request, response) => {
  const payload = categorySchema.parse(request.body); const slug = slugify(payload.slug || payload.name);
  await pool.query(`UPDATE custom_categories SET parent_id=?, name=?, slug=?, description=?, thumbnail_url=?, display_order=?, is_active=? WHERE id=? AND deleted_at IS NULL`,
    [payload.parentId ?? null, payload.name, slug, payload.description ?? null, payload.thumbnailUrl ?? null, payload.displayOrder, payload.isActive ? 1 : 0, request.params.id]);
  response.json({ item: { id: request.params.id, ...payload, slug } });
}));
adminCustomisationRouter.delete("/categories/:id", asyncHandler(async (request, response) => {
  const [children] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM custom_categories WHERE parent_id = ? AND deleted_at IS NULL", [request.params.id]);
  const [products] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM custom_products WHERE (category_id = ? OR subcategory_id = ?) AND deleted_at IS NULL", [request.params.id, request.params.id]);
  if (Number(children[0]?.total) || Number(products[0]?.total)) throw new HttpError(409, "Move or remove child categories and custom products first.");
  await pool.query("UPDATE custom_categories SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id = ?", [request.params.id]); response.status(204).send();
}));

adminCustomisationRouter.get("/products", asyncHandler(async (_request, response) => response.json({ items: await fetchProducts(false) })));
adminCustomisationRouter.get("/products/:slug/configuration", asyncHandler(async (request, response) => response.json({ item: await fetchConfiguration(String(request.params.slug), false) })));

async function replaceProductConfiguration(productId: string, payload: z.infer<typeof productSchema>) {
  await withTransaction(async (connection) => {
    await connection.query("DELETE FROM custom_product_printing_methods WHERE product_id = ?", [productId]);
    await connection.query("DELETE FROM custom_print_areas WHERE product_id = ?", [productId]);
    await connection.query("DELETE FROM custom_product_sizes WHERE product_id = ?", [productId]);
    await connection.query("UPDATE custom_products SET default_colour_id = NULL WHERE id = ?", [productId]);
    await connection.query("UPDATE custom_product_colours SET deleted_at = CURRENT_TIMESTAMP, is_active = 0, is_default = 0 WHERE product_id = ?", [productId]);
    for (let sizeIndex = 0; sizeIndex < payload.sizes.length; sizeIndex += 1) {
      const size = payload.sizes[sizeIndex];
      await connection.query("INSERT INTO custom_product_sizes (id, product_id, name, additional_price, display_order) VALUES (?, ?, ?, ?, ?)", [uuid(), productId, size.name, size.additionalPrice, (sizeIndex + 1) * 10]);
    }
    let defaultColourId: string | null = null;
    for (const colour of payload.colours) {
      const colourId = colour.id ?? uuid(); if (colour.isDefault) defaultColourId = colourId;
      await connection.query(`INSERT INTO custom_product_colours (id, product_id, name, slug, hex_code, additional_price, is_default, is_active, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name=VALUES(name), slug=VALUES(slug), hex_code=VALUES(hex_code), additional_price=VALUES(additional_price), is_default=VALUES(is_default), is_active=VALUES(is_active), display_order=VALUES(display_order), deleted_at=NULL`,
        [colourId, productId, colour.name, slugify(colour.slug || colour.name), colour.hexCode, colour.additionalPrice, colour.isDefault ? 1 : 0, colour.isActive ? 1 : 0, colour.displayOrder]);
      for (const view of colour.views) await connection.query(`INSERT INTO custom_product_views (id, colour_id, side, image_url, public_id, natural_width, natural_height, is_placeholder) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE image_url=VALUES(image_url), public_id=VALUES(public_id), natural_width=VALUES(natural_width), natural_height=VALUES(natural_height), is_placeholder=VALUES(is_placeholder)`,
        [view.id ?? uuid(), colourId, view.side, view.imageUrl, view.publicId ?? null, view.naturalWidth, view.naturalHeight, view.isPlaceholder ? 1 : 0]);
    }
    await connection.query("UPDATE custom_products SET default_colour_id = ? WHERE id = ?", [defaultColourId, productId]);
    for (const area of payload.printAreas) await connection.query(`INSERT INTO custom_print_areas (id, product_id, colour_id, side, reference_width, reference_height, x, y, width, height, printing_area_mode, default_area, safe_boundary_type, garment_safe_area, garment_safe_polygon, garment_mask_url, safe_area_version, min_width_normalized, min_height_normalized, max_width_normalized, max_height_normalized, allow_move, allow_resize, allow_custom_area_selection, real_width_cm, real_height_cm, safe_margin, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [area.id ?? uuid(), productId, area.colourId ?? null, area.side, area.referenceWidth, area.referenceHeight, area.x, area.y, area.width, area.height, area.printingAreaMode, JSON.stringify(area.defaultArea ?? { x: area.x / area.referenceWidth, y: area.y / area.referenceHeight, width: area.width / area.referenceWidth, height: area.height / area.referenceHeight }), area.safeBoundaryType, JSON.stringify(area.garmentSafeArea), JSON.stringify(area.garmentSafePolygon), area.garmentMaskUrl ?? null, area.safeAreaVersion, area.minWidthNormalized, area.minHeightNormalized, area.maxWidthNormalized, area.maxHeightNormalized, area.allowMove ? 1 : 0, area.allowResize ? 1 : 0, area.allowCustomAreaSelection ? 1 : 0, area.realWidthCm, area.realHeightCm, area.safeMargin, area.isActive ? 1 : 0]);
    for (const methodId of payload.printingMethodIds) await connection.query("INSERT INTO custom_product_printing_methods (product_id, printing_method_id) VALUES (?, ?)", [productId, methodId]);
  });
}

adminCustomisationRouter.post("/products", asyncHandler(async (request, response) => {
  const payload = productSchema.parse(request.body); const id = uuid(); const slug = slugify(payload.slug || payload.name);
  await pool.query(`INSERT INTO custom_products (id, category_id, subcategory_id, name, slug, description, specification, base_price, thumbnail_url, model_url, viewer_mode, model_format, model_scale, model_position, model_rotation, material_names, model_artwork_mappings, is_active, is_featured, is_placeholder, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, payload.categoryId, payload.subcategoryId ?? null, payload.name, slug, payload.description ?? null, payload.specification ?? null, payload.basePrice, payload.thumbnailUrl ?? null, payload.modelUrl ?? null, payload.viewerMode, payload.modelFormat ?? null, payload.modelScale, JSON.stringify(payload.modelPosition), JSON.stringify(payload.modelRotation), JSON.stringify(payload.materialNames), JSON.stringify(payload.modelArtworkMappings), payload.isActive ? 1 : 0, payload.isFeatured ? 1 : 0, payload.isPlaceholder ? 1 : 0, payload.displayOrder]);
  try { await replaceProductConfiguration(id, payload); } catch (error) { await pool.query("DELETE FROM custom_products WHERE id = ?", [id]); throw error; }
  response.status(201).json({ item: await fetchConfiguration(slug, false) });
}));
adminCustomisationRouter.put("/products/:id", asyncHandler(async (request, response) => {
  const payload = productSchema.parse(request.body); const slug = slugify(payload.slug || payload.name);
  await pool.query(`UPDATE custom_products SET category_id=?, subcategory_id=?, name=?, slug=?, description=?, specification=?, base_price=?, thumbnail_url=?, model_url=?, viewer_mode=?, model_format=?, model_scale=?, model_position=?, model_rotation=?, material_names=?, model_artwork_mappings=?, is_active=?, is_featured=?, is_placeholder=?, display_order=? WHERE id=? AND deleted_at IS NULL`,
    [payload.categoryId, payload.subcategoryId ?? null, payload.name, slug, payload.description ?? null, payload.specification ?? null, payload.basePrice, payload.thumbnailUrl ?? null, payload.modelUrl ?? null, payload.viewerMode, payload.modelFormat ?? null, payload.modelScale, JSON.stringify(payload.modelPosition), JSON.stringify(payload.modelRotation), JSON.stringify(payload.materialNames), JSON.stringify(payload.modelArtworkMappings), payload.isActive ? 1 : 0, payload.isFeatured ? 1 : 0, payload.isPlaceholder ? 1 : 0, payload.displayOrder, request.params.id]);
  await replaceProductConfiguration(String(request.params.id), payload); response.json({ item: await fetchConfiguration(slug, false) });
}));
adminCustomisationRouter.delete("/products/:id", asyncHandler(async (request, response) => {
  await pool.query("UPDATE custom_products SET deleted_at = CURRENT_TIMESTAMP, is_active = 0 WHERE id = ?", [request.params.id]); response.status(204).send();
}));

adminCustomisationRouter.get("/printing-methods", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT * FROM custom_printing_methods ORDER BY display_order, name"); response.json({ items: rows });
}));

adminCustomisationRouter.get("/orders", asyncHandler(async (_request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT co.*, o.order_number, o.status, oi.product_name, oi.quantity, oi.total_price FROM customisation_orders co INNER JOIN orders o ON o.id=co.order_id INNER JOIN order_items oi ON oi.id=co.order_item_id ORDER BY co.created_at DESC`);
  response.json({ items: rows.map((row) => ({ ...row, pricing_breakdown: parseJsonValue(row.pricing_breakdown, {}), canvas_json: parseJsonValue(row.canvas_json, {}), printing_areas: parseJsonValue(row.printing_areas, {}), safe_area_versions: parseJsonValue(row.safe_area_versions, {}), preview_urls: parseJsonValue(row.preview_urls, {}), dpi_warning_status: parseJsonValue(row.dpi_warning_status, {}), physical_output_dimensions: parseJsonValue(row.physical_output_dimensions, {}) })) });
}));
