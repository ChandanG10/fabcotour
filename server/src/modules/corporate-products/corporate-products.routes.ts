import { randomUUID } from "node:crypto";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import type { RowDataPacket, ResultSetHeader } from "mysql2";
import { z } from "zod";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { upload } from "../../utils/upload.js";
import { uploadImageToCloudinary, deleteCloudinaryImage } from "../uploads/uploads.service.js";
import { corporateProductSchema, corporateQuoteSchema, type CorporateProductInput } from "./corporate-products.schema.js";

const fields = {
 name: "name", slug: "slug", category: "category", shortDescription: "short_description", description: "description",
 mainImage: "main_image", additionalImages: "additional_images", includedItems: "included_items",
 minimumOrderQuantity: "minimum_order_quantity", startingPrice: "starting_price", pricingType: "pricing_type",
 customisationAvailable: "customisation_available", logoPrintingAvailable: "logo_printing_available",
 employeeNamePersonalisation: "employee_name_personalisation", customPackagingAvailable: "custom_packaging_available",
 bulkQuantityAvailable: "bulk_quantity_available", deliveryInformation: "delivery_information",
 isFeatured: "is_featured", isActive: "is_active", displayOrder: "display_order"
} satisfies Record<keyof CorporateProductInput, string>;
const bools = new Set(["customisationAvailable", "logoPrintingAvailable", "employeeNamePersonalisation", "customPackagingAvailable", "bulkQuantityAvailable", "isFeatured", "isActive"]);
function mapProduct(row: RowDataPacket) {
 return { id: row.id, ...Object.fromEntries(Object.entries(fields).map(([key, column]) => {
  let value = row[column];
  if (["additionalImages", "includedItems"].includes(key) && typeof value === "string") value = JSON.parse(value);
  if (bools.has(key)) value = Boolean(value);
  return [key, value];
 })) };
}
async function getProduct(key: string, publicOnly = false) {
 const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM corporate_products WHERE ${publicOnly ? "slug" : "id"} = ? AND deleted_at IS NULL ${publicOnly ? "AND is_active = 1" : ""}`, [key]);
 if (!rows[0]) throw new HttpError(404, "Corporate product not found.");
 return rows[0];
}
export const adminCorporateProductsRouter = Router();
export const corporateProductsRouter = Router();
adminCorporateProductsRouter.use(requireAdminAuth);

for (const [router, publicOnly] of [[adminCorporateProductsRouter, false], [corporateProductsRouter, true]] as const) {
 router.get("/", asyncHandler(async (request, response) => {
  const query = z.object({ search: z.string().max(200).default(""), category: z.string().max(120).default("") }).parse(request.query);
  const conditions = ["deleted_at IS NULL", ...(publicOnly ? ["is_active = 1"] : [])];
  const values: unknown[] = [];
  if (query.search) { conditions.push("(name LIKE ? OR short_description LIKE ?)"); values.push(`%${query.search}%`, `%${query.search}%`); }
  if (query.category) { conditions.push("category = ?"); values.push(query.category); }
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT * FROM corporate_products WHERE ${conditions.join(" AND ")} ORDER BY display_order, is_featured DESC, name`, values);
  const [categories] = await pool.query<RowDataPacket[]>(`SELECT DISTINCT category FROM corporate_products WHERE deleted_at IS NULL ${publicOnly ? "AND is_active=1" : ""} ORDER BY category`);
  response.json({ items: rows.map(mapProduct), categories: categories.map(row => row.category) });
 }));
 router.get("/:key", asyncHandler(async (request, response) => { response.json({ item: mapProduct(await getProduct(String(request.params.key), publicOnly)) }); }));
}
async function saveProduct(payload: CorporateProductInput, id: string, create: boolean) {
 const values = Object.entries(fields).map(([key]) => {
  const value = payload[key as keyof CorporateProductInput];
  return Array.isArray(value) ? JSON.stringify(value) : value;
 });
 try {
  if (create) await pool.query(`INSERT INTO corporate_products (id,${Object.values(fields).join(",")}) VALUES (${[id, ...values].map(() => "?").join(",")})`, [id, ...values]);
  else {
   await getProduct(id);
   await pool.query(`UPDATE corporate_products SET ${Object.values(fields).map(column => `${column}=?`).join(",")} WHERE id=? AND deleted_at IS NULL`, [...values, id]);
  }
 } catch (error) {
  if ((error as { code?: string }).code === "ER_DUP_ENTRY") throw new HttpError(409, "This slug is already in use. Choose a different slug.");
  throw error;
 }
 return mapProduct(await getProduct(id));
}
adminCorporateProductsRouter.post("/", asyncHandler(async (request, response) => {
 response.status(201).json({ item: await saveProduct(corporateProductSchema.parse(request.body), randomUUID(), true) });
}));
adminCorporateProductsRouter.put("/:id", asyncHandler(async (request, response) => {
 response.json({ item: await saveProduct(corporateProductSchema.parse(request.body), String(request.params.id), false) });
}));
adminCorporateProductsRouter.patch("/:id", asyncHandler(async (request, response) => {
 const patch = z.object({ isActive: z.boolean().optional(), isFeatured: z.boolean().optional(), displayOrder: z.number().int().min(0).max(1000000).optional() }).strict().parse(request.body);
 const id = String(request.params.id);
 await getProduct(id);
 const entries = Object.entries(patch);
 if (!entries.length) throw new HttpError(400, "Choose a field to update.");
 await pool.query(`UPDATE corporate_products SET ${entries.map(([key]) => `${fields[key as keyof typeof patch]}=?`).join(",")} WHERE id=? AND deleted_at IS NULL`, [...entries.map(([, value]) => value), id]);
 response.json({ item: mapProduct(await getProduct(id)) });
}));
adminCorporateProductsRouter.delete("/:id", asyncHandler(async (request, response) => {
 const [result] = await pool.query<ResultSetHeader>("UPDATE corporate_products SET deleted_at=NOW(), is_active=0 WHERE id=? AND deleted_at IS NULL", [request.params.id]);
 if (!result.affectedRows) throw new HttpError(404, "Corporate product not found.");
 response.status(204).end();
}));

corporateProductsRouter.post("/:slug/enquiries", rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: true, legacyHeaders: false,
 message: { message: "Too many enquiries. Please try again in 15 minutes." }
}), upload.single("artwork"), asyncHandler(async (request, response) => {
 const data = corporateQuoteSchema.parse(request.body);
 const product = await getProduct(String(request.params.slug), true);
 if (data.quantity < product.minimum_order_quantity) throw new HttpError(400, `Minimum order quantity is ${product.minimum_order_quantity}.`);
 let attachment: Awaited<ReturnType<typeof uploadImageToCloudinary>> | undefined;
 if (request.file) attachment = await uploadImageToCloudinary(request.file, "fab-couture/corporate-enquiries");
 const id = randomUUID();
 try {
  await pool.query(`INSERT INTO corporate_enquiries (id,company_name,contact_person,work_email,phone_number,required_products,estimated_quantity,message,attachment_url,attachment_public_id) VALUES (?,?,?,?,?,?,?,?,?,?)`,
   [id, data.companyName, data.name, data.email, data.phone, product.name, String(data.quantity), data.message, attachment?.url ?? null, attachment?.publicId ?? null]);
 } catch (error) {
  if (attachment) await deleteCloudinaryImage(attachment.publicId).catch(() => undefined);
  throw error;
 }
 response.status(201).json({ success: true, id, message: "Your enquiry has been saved. Our team will contact you." });
}));
