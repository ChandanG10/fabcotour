import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { pool, withTransaction } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { parseJsonValue } from "../../utils/json.js";
import { paginationSchema, getPaginationMeta } from "../../utils/pagination.js";
import { slugify } from "../../utils/slug.js";
import { deleteCloudinaryImage } from "../uploads/uploads.service.js";

const numberFromUnknown = (fallback = 0) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().nonnegative());

const intFromUnknown = (fallback = 0) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    if (typeof value === "number") {
      return Math.trunc(value);
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : value;
  }, z.number().int().nonnegative());

const nullableNumberFromUnknown = () =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number().nonnegative().nullable());

const imageSchema = z.object({
  id: z.string().min(1).optional(),
  imageUrl: z.string().url(),
  publicId: z.string().min(1),
  altText: z.string().optional().nullable(),
  sortOrder: intFromUnknown(0).default(0),
  isPrimary: z.boolean().default(false),
  variantColor: z.string().trim().min(1).optional().nullable(),
  variantSize: z.string().trim().min(1).optional().nullable(),
  variantView: z.enum(["front", "back", "left", "right"]).optional().nullable(),
  isVariantPrimary: z.boolean().default(false)
});

const imageListSchema = z.array(imageSchema).superRefine((images, context) => {
  const primaryColors = new Map<string, number>();

  images.forEach((image, index) => {
    if (image.variantColor && !image.variantView) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A mapped image must have a view.",
        path: [index, "variantView"]
      });
    }
    if (!image.variantColor && (image.variantSize || image.variantView || image.isVariantPrimary)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a colour before assigning size, view or colour primary.",
        path: [index, "variantColor"]
      });
    }
    if (image.isVariantPrimary && image.variantColor) {
      const colorKey = image.variantColor.trim().toLowerCase();
      const previousIndex = primaryColors.get(colorKey);
      if (previousIndex !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Only one primary image can be assigned to each colour.",
          path: [index, "isVariantPrimary"]
        });
      } else {
        primaryColors.set(colorKey, index);
      }
    }
  });
});

const variantSchema = z.object({
  id: z.string().min(1).optional(),
  sku: z.string().min(2),
  color: z.string().nullable().optional(),
  colorHex: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  stock: intFromUnknown(0).default(0),
  priceAdjustment: z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return 0;
    }

    if (typeof value === "number") {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : value;
  }, z.number()).default(0)
});

const productSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).nullable().optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  sku: z.string().min(2),
  shortDescription: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  specifications: z.array(z.string()).default([]),
  audience: z.enum(["men", "women", "kids", "unisex", "business"]).default("unisex"),
  price: numberFromUnknown(0),
  originalPrice: nullableNumberFromUnknown().optional(),
  gstPercent: numberFromUnknown(0).default(0),
  stock: intFromUnknown(0).default(0),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  fabric: z.string().nullable().optional(),
  fit: z.string().nullable().optional(),
  gsm: z.string().nullable().optional(),
  printingMethod: z.string().nullable().optional(),
  seoTitle: z.string().nullable().optional(),
  seoMetaDescription: z.string().nullable().optional(),
  isBestseller: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isCustomisable: z.boolean().default(true),
  isArchived: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  images: imageListSchema.default([]),
  variants: z.array(variantSchema).default([])
}).superRefine((product, context) => {
  const colors = new Set(product.colors.map((color) => color.trim().toLowerCase()));
  const sizes = new Set(product.sizes.map((size) => size.trim().toLowerCase()));

  product.images.forEach((image, index) => {
    if (image.variantColor && !colors.has(image.variantColor.trim().toLowerCase())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mapped image colour must exist in the product colours.",
        path: ["images", index, "variantColor"]
      });
    }
    if (image.variantSize && !sizes.has(image.variantSize.trim().toLowerCase())) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mapped image size must exist in the product sizes.",
        path: ["images", index, "variantSize"]
      });
    }
  });
});

interface ProductRow extends RowDataPacket {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  slug: string;
  sku: string;
  short_description: string | null;
  description: string | null;
  specifications: unknown;
  audience: "men" | "women" | "kids" | "unisex" | "business";
  price: number;
  original_price: number | null;
  gst_percent: number;
  stock: number;
  sizes: unknown;
  colors: unknown;
  fabric: string | null;
  fit: string | null;
  gsm: string | null;
  printing_method: string | null;
  seo_title: string | null;
  seo_meta_description: string | null;
  is_bestseller: number;
  is_featured: number;
  is_new_arrival: number;
  is_customisable: number;
  is_archived: number;
  is_visible: number;
  created_at: string;
  updated_at: string;
}

interface ProductImageRow extends RowDataPacket {
  id: string;
  product_id: string;
  image_url: string;
  public_id: string;
  alt_text: string | null;
  sort_order: number;
  is_primary: number;
  variant_color: string | null;
  variant_size: string | null;
  variant_view: "front" | "back" | "left" | "right" | null;
  is_variant_primary: number;
}

interface VariantRow extends RowDataPacket {
  id: string;
  product_id: string;
  sku: string;
  color: string | null;
  color_hex: string | null;
  size: string | null;
  stock: number;
  price_adjustment: number;
}

async function fetchProductsByWhere(whereClause = "1=1", params: unknown[] = []) {
  const [products] = await pool.query<ProductRow[]>(
    `SELECT * FROM products WHERE deleted_at IS NULL AND ${whereClause} ORDER BY created_at DESC`,
    params
  );

  if (products.length === 0) {
    return [];
  }

  const ids = products.map((product) => product.id);
  const placeholders = ids.map(() => "?").join(",");
  const [images] = await pool.query<ProductImageRow[]>(
    `SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, created_at ASC`,
    ids
  );
  const [variants] = await pool.query<VariantRow[]>(
    `SELECT * FROM product_variants WHERE deleted_at IS NULL AND product_id IN (${placeholders}) ORDER BY created_at ASC`,
    ids
  );

  return products.map((product) => ({
    id: product.id,
    categoryId: product.category_id,
    subcategoryId: product.subcategory_id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.short_description,
    description: product.description,
    specifications: parseJsonValue<string[]>(product.specifications, []),
    audience: product.audience,
    price: Number(product.price),
    originalPrice: product.original_price == null ? null : Number(product.original_price),
    gstPercent: Number(product.gst_percent),
    stock: product.stock,
    sizes: parseJsonValue<string[]>(product.sizes, []),
    colors: parseJsonValue<string[]>(product.colors, []),
    fabric: product.fabric,
    fit: product.fit,
    gsm: product.gsm,
    printingMethod: product.printing_method,
    seoTitle: product.seo_title,
    seoMetaDescription: product.seo_meta_description,
    isBestseller: Boolean(product.is_bestseller),
    isFeatured: Boolean(product.is_featured),
    isNewArrival: Boolean(product.is_new_arrival),
    isCustomisable: Boolean(product.is_customisable),
    isArchived: Boolean(product.is_archived),
    isVisible: Boolean(product.is_visible),
    createdAt: product.created_at,
    updatedAt: product.updated_at,
    images: images
      .filter((image) => image.product_id === product.id)
      .map((image) => ({
        id: image.id,
        imageUrl: image.image_url,
        publicId: image.public_id,
        altText: image.alt_text,
        sortOrder: image.sort_order,
        isPrimary: Boolean(image.is_primary),
        variantColor: image.variant_color,
        variantSize: image.variant_size,
        variantView: image.variant_view,
        isVariantPrimary: Boolean(image.is_variant_primary)
      })),
    variants: variants
      .filter((variant) => variant.product_id === product.id)
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        color: variant.color,
        colorHex: variant.color_hex,
        size: variant.size,
        stock: variant.stock,
        priceAdjustment: Number(variant.price_adjustment)
      }))
  }));
}

async function replaceImages(connection: PoolConnection, productId: string, images: Array<z.infer<typeof imageSchema>>) {
  await connection.query("DELETE FROM product_images WHERE product_id = ?", [productId]);
  for (const image of images) {
    await connection.query(
      `INSERT INTO product_images (
        id, product_id, image_url, public_id, alt_text, sort_order, is_primary,
        variant_color, variant_size, variant_view, is_variant_primary
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        image.id ?? uuid(),
        productId,
        image.imageUrl,
        image.publicId,
        image.altText ?? null,
        image.sortOrder,
        image.isPrimary ? 1 : 0,
        image.variantColor ?? null,
        image.variantSize ?? null,
        image.variantView ?? null,
        image.isVariantPrimary ? 1 : 0
      ]
    );
  }
}

async function replaceVariants(connection: PoolConnection, productId: string, variants: Array<z.infer<typeof variantSchema>>) {
  await connection.query("DELETE FROM product_variants WHERE product_id = ?", [productId]);
  await connection.query("DELETE FROM inventory WHERE product_id = ?", [productId]);
  for (const variant of variants) {
    const variantId = variant.id ?? uuid();
    await connection.query(
      `INSERT INTO product_variants (id, product_id, sku, color, color_hex, size, stock, price_adjustment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        variantId,
        productId,
        variant.sku,
        variant.color ?? null,
        variant.colorHex ?? null,
        variant.size ?? null,
        variant.stock,
        variant.priceAdjustment
      ]
    );
    await connection.query(
      `INSERT INTO inventory (id, product_id, variant_id, quantity, low_stock_threshold)
       VALUES (?, ?, ?, ?, ?)`,
      [uuid(), productId, variantId, variant.stock, 5]
    );
  }
}

export const productsRouter = Router();

productsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const { page, limit, search } = paginationSchema.parse(request.query);
    const offset = (page - 1) * limit;
    const where = search ? "deleted_at IS NULL AND name LIKE ?" : "deleted_at IS NULL";
    const params = search ? [`%${search}%`] : [];
    const [rows] = await pool.query<ProductRow[]>(
      `SELECT * FROM products WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM products WHERE ${where}`,
      params
    );

    const full = await fetchProductsByWhere(`id IN (${rows.map(() => "?").join(",") || "''"})`, rows.map((row) => row.id));

    response.json({
      items: full,
      meta: getPaginationMeta(Number(countRows[0]?.total ?? 0), page, limit)
    });
  })
);

productsRouter.get(
  "/:id",
  asyncHandler(async (request, response) => {
    const product = (await fetchProductsByWhere("id = ?", [request.params.id]))[0];
    if (!product) {
      throw new HttpError(404, "Product not found.");
    }
    response.json({ item: product });
  })
);

productsRouter.post(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = productSchema.parse(request.body);
    const id = uuid();
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

    await withTransaction(async (connection) => {
      await connection.query(
        `INSERT INTO products (
          id, category_id, subcategory_id, name, slug, sku, short_description, description, specifications,
          audience, price, original_price, gst_percent, stock, sizes, colors, fabric, fit, gsm,
          printing_method, seo_title, seo_meta_description, is_bestseller, is_featured,
          is_new_arrival, is_customisable, is_archived, is_visible
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          payload.categoryId,
          payload.subcategoryId ?? null,
          payload.name,
          slug,
          payload.sku,
          payload.shortDescription ?? null,
          payload.description ?? null,
          JSON.stringify(payload.specifications),
          payload.audience,
          payload.price,
          payload.originalPrice ?? null,
          payload.gstPercent,
          payload.stock,
          JSON.stringify(payload.sizes),
          JSON.stringify(payload.colors),
          payload.fabric ?? null,
          payload.fit ?? null,
          payload.gsm ?? null,
          payload.printingMethod ?? null,
          payload.seoTitle ?? null,
          payload.seoMetaDescription ?? null,
          payload.isBestseller ? 1 : 0,
          payload.isFeatured ? 1 : 0,
          payload.isNewArrival ? 1 : 0,
          payload.isCustomisable ? 1 : 0,
          payload.isArchived ? 1 : 0,
          payload.isVisible ? 1 : 0
        ]
      );

      await replaceImages(connection, id, payload.images);
      await replaceVariants(connection, id, payload.variants);
      await connection.query(
        `INSERT INTO inventory (id, product_id, variant_id, quantity, low_stock_threshold)
         VALUES (?, ?, NULL, ?, ?)`,
        [uuid(), id, payload.stock, 5]
      );
    });

    const product = (await fetchProductsByWhere("id = ?", [id]))[0];
    response.status(201).json({ item: product });
  })
);

productsRouter.put(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const productId = String(request.params.id);
    const payload = productSchema.parse(request.body);
    const slug = payload.slug ? slugify(payload.slug) : slugify(payload.name);

    await withTransaction(async (connection) => {
      await connection.query(
        `UPDATE products
         SET category_id = ?, subcategory_id = ?, name = ?, slug = ?, sku = ?, short_description = ?, description = ?,
             specifications = ?, audience = ?, price = ?, original_price = ?, gst_percent = ?, stock = ?, sizes = ?,
             colors = ?, fabric = ?, fit = ?, gsm = ?, printing_method = ?, seo_title = ?, seo_meta_description = ?,
             is_bestseller = ?, is_featured = ?, is_new_arrival = ?, is_customisable = ?, is_archived = ?, is_visible = ?
         WHERE id = ?`,
        [
          payload.categoryId,
          payload.subcategoryId ?? null,
          payload.name,
          slug,
          payload.sku,
          payload.shortDescription ?? null,
          payload.description ?? null,
          JSON.stringify(payload.specifications),
          payload.audience,
          payload.price,
          payload.originalPrice ?? null,
          payload.gstPercent,
          payload.stock,
          JSON.stringify(payload.sizes),
          JSON.stringify(payload.colors),
          payload.fabric ?? null,
          payload.fit ?? null,
          payload.gsm ?? null,
          payload.printingMethod ?? null,
          payload.seoTitle ?? null,
          payload.seoMetaDescription ?? null,
          payload.isBestseller ? 1 : 0,
          payload.isFeatured ? 1 : 0,
          payload.isNewArrival ? 1 : 0,
          payload.isCustomisable ? 1 : 0,
          payload.isArchived ? 1 : 0,
          payload.isVisible ? 1 : 0,
          productId
        ]
      );

      await replaceImages(connection, productId, payload.images);
      await replaceVariants(connection, productId, payload.variants);
      await connection.query("UPDATE inventory SET quantity = ? WHERE product_id = ? AND variant_id IS NULL", [payload.stock, productId]);
    });

    const product = (await fetchProductsByWhere("id = ?", [productId]))[0];
    response.json({ item: product });
  })
);

productsRouter.patch(
  "/:id/archive",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const schema = z.object({ isArchived: z.boolean() });
    const payload = schema.parse(request.body);
    await pool.query("UPDATE products SET is_archived = ? WHERE id = ?", [payload.isArchived ? 1 : 0, request.params.id]);
    const product = (await fetchProductsByWhere("id = ?", [request.params.id]))[0];
    response.json({ item: product });
  })
);

productsRouter.delete(
  "/:id",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const product = (await fetchProductsByWhere("id = ?", [request.params.id]))[0];
    if (product) {
      await Promise.all(product.images.map((image) => deleteCloudinaryImage(image.publicId)));
    }
    await pool.query("UPDATE products SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?", [request.params.id]);
    response.status(204).send();
  })
);

productsRouter.patch(
  "/:id/images/reorder",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const schema = z.object({
      images: z.array(z.object({ id: z.string().min(1), sortOrder: z.number().int(), isPrimary: z.boolean().default(false) }))
    });
    const payload = schema.parse(request.body);

    await withTransaction(async (connection) => {
      for (const image of payload.images) {
        await connection.query(
          "UPDATE product_images SET sort_order = ?, is_primary = ? WHERE id = ? AND product_id = ?",
          [image.sortOrder, image.isPrimary ? 1 : 0, image.id, request.params.id]
        );
      }
    });

    const product = (await fetchProductsByWhere("id = ?", [request.params.id]))[0];
    response.json({ item: product });
  })
);

productsRouter.delete(
  "/:id/images/:imageId",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const [rows] = await pool.query<ProductImageRow[]>(
      "SELECT * FROM product_images WHERE id = ? AND product_id = ? LIMIT 1",
      [request.params.imageId, request.params.id]
    );

    const image = rows[0];
    if (!image) {
      throw new HttpError(404, "Image not found.");
    }

    await deleteCloudinaryImage(image.public_id);
    await pool.query("DELETE FROM product_images WHERE id = ?", [image.id]);
    response.status(204).send();
  })
);

export const storeProductsRouter = Router();

storeProductsRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    const audience = typeof request.query.audience === "string" ? request.query.audience : undefined;
    const categoryId = typeof request.query.categoryId === "string" ? request.query.categoryId : undefined;
    const featured = request.query.featured === "true";
    const newArrival = request.query.newArrival === "true";
    const search = typeof request.query.search === "string" ? request.query.search : undefined;

    const clauses = ["is_visible = 1", "is_archived = 0"];
    const params: unknown[] = [];

    if (audience) {
      clauses.push("audience = ?");
      params.push(audience);
    }
    if (categoryId) {
      clauses.push("(category_id = ? OR subcategory_id = ?)");
      params.push(categoryId, categoryId);
    }
    if (featured) {
      clauses.push("is_featured = 1");
    }
    if (newArrival) {
      clauses.push("is_new_arrival = 1");
    }
    if (search) {
      clauses.push("name LIKE ?");
      params.push(`%${search}%`);
    }

    const products = await fetchProductsByWhere(clauses.join(" AND "), params);
    response.json({ items: products });
  })
);

storeProductsRouter.get(
  "/:slug",
  asyncHandler(async (request, response) => {
    const product = (await fetchProductsByWhere("slug = ? AND is_visible = 1 AND is_archived = 0", [request.params.slug]))[0];
    if (!product) {
      throw new HttpError(404, "Product not found.");
    }
    response.json({ item: product });
  })
);
