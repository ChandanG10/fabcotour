import { Router, type Request } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { pool, withTransaction } from "../../db/pool.js";
import { requireCustomerAuth } from "../../middleware/customer-auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { parseJsonValue } from "../../utils/json.js";
import { upload } from "../../utils/upload.js";
import { uploadImageToCloudinary } from "../uploads/uploads.service.js";
import { getCustomerById, updateCustomerAvatar, updateCustomerProfile } from "../customer-auth/customer-auth.service.js";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(10).max(32).regex(/^[+()\d\s-]+$/, "Enter a valid mobile number.")
});
const addressSchema = z.object({
  label: z.enum(["Home", "Office"]), recipient: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(10).max(32).regex(/^[+()\d\s-]+$/),
  line1: z.string().trim().min(5).max(255), line2: z.string().trim().max(255).optional().default(""),
  landmark: z.string().trim().max(255).optional().default(""), city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120), pinCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  country: z.string().trim().min(2).max(120).default("India"), isDefault: z.boolean().default(false)
});
const wishlistSchema = z.object({ productId: z.string().uuid() });
const designSchema = z.object({
  customProductId: z.string().uuid(), customColourId: z.string().uuid(), selectedSize: z.string().trim().min(1).max(64),
  printingMethodId: z.string().uuid().nullable().optional(), title: z.string().trim().min(1).max(180).default("Untitled design"),
  designData: z.record(z.string(), z.unknown()), previewUrl: z.string().max(1_500_000).nullable().optional()
});

function customerId(request: Request) {
  if (!request.customer) throw new HttpError(401, "Please sign in to continue.");
  return request.customer.id;
}

function serializeAddress(row: RowDataPacket) {
  return {
    id: String(row.id), label: String(row.label), recipient: String(row.recipient), phone: String(row.phone),
    line1: String(row.line1), line2: row.line2 ? String(row.line2) : undefined,
    landmark: row.landmark ? String(row.landmark) : undefined, city: String(row.city), state: String(row.state),
    pinCode: String(row.pin_code), country: String(row.country), isDefault: Boolean(row.is_default)
  };
}

async function listAddresses(userId: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM addresses WHERE user_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC", [userId]
  );
  return rows.map(serializeAddress);
}

async function listOrders(userId: string) {
  const [orders] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM orders WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC", [userId]
  );
  if (!orders.length) return [];
  const placeholders = orders.map(() => "?").join(",");
  const [items] = await pool.query<RowDataPacket[]>(
    `SELECT oi.*,
      COALESCE((SELECT pi.image_url FROM product_images pi WHERE pi.product_id=oi.product_id ORDER BY pi.is_primary DESC, pi.sort_order LIMIT 1),
               (SELECT cp.thumbnail_url FROM custom_products cp WHERE cp.id=oi.custom_product_id LIMIT 1)) AS product_image
     FROM order_items oi WHERE oi.order_id IN (${placeholders}) ORDER BY oi.created_at`,
    orders.map((order) => order.id)
  );
  return orders.map((order) => ({
    id: String(order.id), orderNumber: String(order.order_number), invoiceNumber: order.invoice_number ? String(order.invoice_number) : undefined,
    createdAt: order.created_at, status: String(order.status), paymentStatus: String(order.payment_status),
    paymentMethod: String(order.payment_method ?? ""), trackingNumber: order.tracking_number ? String(order.tracking_number) : null,
    subtotal: Number(order.subtotal), shipping: Number(order.shipping_amount), discount: Number(order.discount_amount), total: Number(order.total_amount),
    address: parseJsonValue(order.shipping_address, null),
    items: items.filter((item) => item.order_id === order.id).map((item) => ({
      id: String(item.id), type: String(item.item_type), productId: item.product_id ? String(item.product_id) : "",
      customProductId: item.custom_product_id ? String(item.custom_product_id) : undefined,
      variantId: item.variant_id ? String(item.variant_id) : null, productName: String(item.product_name),
      selectedColor: item.selected_color ? String(item.selected_color) : undefined,
      selectedSize: item.selected_size ? String(item.selected_size) : undefined,
      quantity: Number(item.quantity), price: Number(item.unit_price), total: Number(item.total_price),
      image: item.product_image ? String(item.product_image) : "", customization: parseJsonValue(item.customization, null)
    })),
    trackingSteps: [String(order.status)]
  }));
}

export const customerAccountRouter = Router();
customerAccountRouter.use(requireCustomerAuth);

customerAccountRouter.get("/summary", asyncHandler(async (request, response) => {
  const id = customerId(request);
  const [[counts]] = await pool.query<RowDataPacket[]>(
    `SELECT
      (SELECT COUNT(*) FROM orders WHERE user_id=? AND deleted_at IS NULL) AS orders,
      (SELECT COUNT(*) FROM customer_wishlist_items WHERE user_id=?) AS wishlist,
      (SELECT COUNT(*) FROM custom_designs WHERE user_id=? AND status IN ('draft','saved')) AS designs,
      (SELECT COUNT(*) FROM addresses WHERE user_id=? AND deleted_at IS NULL) AS addresses`, [id, id, id, id]
  );
  response.json({ item: { orders: Number(counts?.orders ?? 0), wishlist: Number(counts?.wishlist ?? 0), designs: Number(counts?.designs ?? 0), addresses: Number(counts?.addresses ?? 0) } });
}));

customerAccountRouter.get("/profile", asyncHandler(async (request, response) => {
  response.json({ item: await getCustomerById(customerId(request)) });
}));

customerAccountRouter.patch("/profile", asyncHandler(async (request, response) => {
  const payload = profileSchema.parse(request.body);
  response.json({ item: await updateCustomerProfile(customerId(request), payload.name, payload.phone) });
}));

customerAccountRouter.post("/profile/avatar", upload.single("avatar"), asyncHandler(async (request, response) => {
  if (!request.file) throw new HttpError(400, "Choose a JPG, PNG or WebP profile picture.");
  const uploaded = await uploadImageToCloudinary(request.file, "fab-couture/customer-avatars");
  response.status(201).json({ item: await updateCustomerAvatar(customerId(request), uploaded.url) });
}));

customerAccountRouter.get("/orders", asyncHandler(async (request, response) => {
  response.json({ items: await listOrders(customerId(request)) });
}));

customerAccountRouter.get("/wishlist", asyncHandler(async (request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, product_id, created_at FROM customer_wishlist_items WHERE user_id = ? ORDER BY created_at DESC", [customerId(request)]
  );
  response.json({ items: rows.map((row) => ({ id: String(row.id), productId: String(row.product_id), createdAt: row.created_at })) });
}));

customerAccountRouter.post("/wishlist", asyncHandler(async (request, response) => {
  const { productId } = wishlistSchema.parse(request.body);
  const [products] = await pool.query<RowDataPacket[]>("SELECT id FROM products WHERE id=? AND deleted_at IS NULL AND is_visible=1 LIMIT 1", [productId]);
  if (!products[0]) throw new HttpError(404, "Product not found.");
  const id = uuid();
  await pool.query("INSERT IGNORE INTO customer_wishlist_items (id, user_id, product_id) VALUES (?, ?, ?)", [id, customerId(request), productId]);
  response.status(201).json({ item: { id, productId, createdAt: new Date().toISOString() } });
}));

customerAccountRouter.delete("/wishlist/:productId", asyncHandler(async (request, response) => {
  const productId = z.string().uuid().parse(request.params.productId);
  await pool.query("DELETE FROM customer_wishlist_items WHERE user_id=? AND product_id=?", [customerId(request), productId]);
  response.status(204).send();
}));

customerAccountRouter.get("/addresses", asyncHandler(async (request, response) => {
  response.json({ items: await listAddresses(customerId(request)) });
}));

customerAccountRouter.post("/addresses", asyncHandler(async (request, response) => {
  const payload = addressSchema.parse(request.body); const userId = customerId(request); const id = uuid();
  await withTransaction(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM addresses WHERE user_id=? AND deleted_at IS NULL", [userId]);
    const makeDefault = payload.isDefault || Number(rows[0]?.total ?? 0) === 0;
    if (makeDefault) await connection.query("UPDATE addresses SET is_default=0 WHERE user_id=?", [userId]);
    await connection.query(
      `INSERT INTO addresses (id,user_id,label,recipient,phone,line1,line2,landmark,city,state,pin_code,country,is_default)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id,userId,payload.label,payload.recipient,payload.phone,payload.line1,payload.line2||null,payload.landmark||null,payload.city,payload.state,payload.pinCode,payload.country,makeDefault?1:0]
    );
  });
  response.status(201).json({ items: await listAddresses(userId) });
}));

customerAccountRouter.put("/addresses/:id", asyncHandler(async (request, response) => {
  const addressId = z.string().uuid().parse(request.params.id); const payload = addressSchema.parse(request.body); const userId = customerId(request);
  await withTransaction(async (connection) => {
    const [owned] = await connection.query<RowDataPacket[]>("SELECT id FROM addresses WHERE id=? AND user_id=? AND deleted_at IS NULL FOR UPDATE", [addressId,userId]);
    if (!owned[0]) throw new HttpError(404, "Address not found.");
    if (payload.isDefault) await connection.query("UPDATE addresses SET is_default=0 WHERE user_id=?", [userId]);
    await connection.query(
      `UPDATE addresses SET label=?,recipient=?,phone=?,line1=?,line2=?,landmark=?,city=?,state=?,pin_code=?,country=?,is_default=?,updated_at=NOW()
       WHERE id=? AND user_id=?`,
      [payload.label,payload.recipient,payload.phone,payload.line1,payload.line2||null,payload.landmark||null,payload.city,payload.state,payload.pinCode,payload.country,payload.isDefault?1:0,addressId,userId]
    );
  });
  response.json({ items: await listAddresses(userId) });
}));

customerAccountRouter.patch("/addresses/:id/default", asyncHandler(async (request, response) => {
  const addressId = z.string().uuid().parse(request.params.id); const userId = customerId(request);
  await withTransaction(async (connection) => {
    const [owned] = await connection.query<RowDataPacket[]>("SELECT id FROM addresses WHERE id=? AND user_id=? AND deleted_at IS NULL FOR UPDATE", [addressId,userId]);
    if (!owned[0]) throw new HttpError(404, "Address not found.");
    await connection.query("UPDATE addresses SET is_default=0 WHERE user_id=?", [userId]);
    await connection.query("UPDATE addresses SET is_default=1 WHERE id=?", [addressId]);
  });
  response.json({ items: await listAddresses(userId) });
}));

customerAccountRouter.delete("/addresses/:id", asyncHandler(async (request, response) => {
  const addressId = z.string().uuid().parse(request.params.id); const userId = customerId(request);
  await withTransaction(async (connection) => {
    const [owned] = await connection.query<RowDataPacket[]>("SELECT id,is_default FROM addresses WHERE id=? AND user_id=? AND deleted_at IS NULL FOR UPDATE", [addressId,userId]);
    if (!owned[0]) throw new HttpError(404, "Address not found.");
    await connection.query("UPDATE addresses SET deleted_at=NOW(),is_default=0 WHERE id=?", [addressId]);
    if (owned[0].is_default) await connection.query("UPDATE addresses SET is_default=1 WHERE user_id=? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1", [userId]);
  });
  response.json({ items: await listAddresses(userId) });
}));

customerAccountRouter.get("/designs", asyncHandler(async (request, response) => {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT d.*,p.name AS product_name,p.slug AS product_slug,c.name AS colour_name,c.slug AS colour_slug
     FROM custom_designs d JOIN custom_products p ON p.id=d.custom_product_id
     JOIN custom_product_colours c ON c.id=d.custom_colour_id
     WHERE d.user_id=? AND d.status IN ('draft','saved') ORDER BY d.updated_at DESC`, [customerId(request)]
  );
  response.json({ items: rows.map((row) => ({ id:String(row.id),title:String(row.title||"Untitled design"),productName:String(row.product_name),productSlug:String(row.product_slug),colourName:String(row.colour_name),colourSlug:String(row.colour_slug),selectedSize:String(row.selected_size),previewUrl:row.preview_url?String(row.preview_url):null,designData:parseJsonValue(row.design_data,{}),updatedAt:row.updated_at })) });
}));

customerAccountRouter.post("/designs", asyncHandler(async (request, response) => {
  const payload=designSchema.parse(request.body); const id=uuid(); const userId=customerId(request);
  await pool.query(`INSERT INTO custom_designs (id,user_id,custom_product_id,custom_colour_id,selected_size,printing_method_id,title,status,design_data,preview_url)
    VALUES (?,?,?,?,?,?,?,'saved',?,?)`,[id,userId,payload.customProductId,payload.customColourId,payload.selectedSize,payload.printingMethodId??null,payload.title,JSON.stringify(payload.designData),payload.previewUrl??null]);
  response.status(201).json({ item:{id} });
}));

customerAccountRouter.put("/designs/:id", asyncHandler(async (request, response) => {
  const designId=z.string().uuid().parse(request.params.id); const payload=designSchema.parse(request.body); const userId=customerId(request);
  const [result]=await pool.query(`UPDATE custom_designs SET custom_product_id=?,custom_colour_id=?,selected_size=?,printing_method_id=?,title=?,status='saved',design_data=?,preview_url=?,updated_at=NOW() WHERE id=? AND user_id=?`,[payload.customProductId,payload.customColourId,payload.selectedSize,payload.printingMethodId??null,payload.title,JSON.stringify(payload.designData),payload.previewUrl??null,designId,userId]);
  if (!(result as {affectedRows:number}).affectedRows) throw new HttpError(404,"Saved design not found.");
  response.json({ item:{id:designId} });
}));

customerAccountRouter.delete("/designs/:id", asyncHandler(async (request, response) => {
  const designId=z.string().uuid().parse(request.params.id);
  await pool.query("DELETE FROM custom_designs WHERE id=? AND user_id=?",[designId,customerId(request)]);
  response.status(204).send();
}));
