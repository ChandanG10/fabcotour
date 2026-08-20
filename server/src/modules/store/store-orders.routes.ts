import { Router } from "express";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { pool, withTransaction } from "../../db/pool.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import { parseJsonValue } from "../../utils/json.js";

const addressSchema = z.object({
  id: z.string().max(120).optional(),
  label: z.string().trim().max(80).optional(),
  recipient: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(10).max(32),
  line1: z.string().trim().min(5).max(255),
  line2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pinCode: z.string().trim().min(6).max(20),
  country: z.string().trim().min(2).max(120)
});

const designLayerSchema = z.object({
  id: z.string().max(120),
  type: z.enum(["text", "image"]),
  view: z.enum(["front", "back", "left", "right"]),
  content: z.string().max(1_500_000),
  color: z.string().max(32).optional(),
  fontSize: z.number().min(8).max(240).optional(),
  fontFamily: z.string().max(120).optional(),
  fontWeight: z.number().min(100).max(900).optional(),
  fontStyle: z.enum(["normal", "italic"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  rotation: z.number().min(-360).max(360),
  x: z.number().finite(), y: z.number().finite(),
  width: z.number().positive().max(2000), height: z.number().positive().max(2000)
});

const customizationSchema = z.object({
  id: z.string().max(120), productId: z.string().uuid(),
  productColor: z.string().max(120), size: z.string().max(64),
  quantity: z.number().int().min(1).max(100),
  printLocation: z.string().max(120), printMethod: z.string().max(120),
  rushDelivery: z.boolean(), embroidery: z.boolean(),
  previewImage: z.string().max(1_500_000).optional(),
  previewView: z.enum(["front", "back", "left", "right"]).optional(),
  layers: z.array(designLayerSchema).max(50)
});

const createOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2).max(160),
    email: z.string().trim().email().max(255),
    phone: z.string().trim().min(10).max(32)
  }),
  address: addressSchema,
  paymentMethod: z.literal("Cash on delivery"),
  couponCode: z.string().trim().max(60).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(), variantId: z.string().uuid().optional(),
    selectedColor: z.string().trim().max(120).optional(),
    selectedSize: z.string().trim().max(64).optional(),
    quantity: z.number().int().min(1).max(100),
    customization: customizationSchema.optional()
  })).min(1).max(50)
});

interface PurchasableRow extends RowDataPacket {
  product_id: string; product_name: string; price: number; gst_percent: number;
  product_stock: number; variant_id: string | null; variant_sku: string; variant_stock: number | null;
}

function customizationCharge(customization?: z.infer<typeof customizationSchema>) {
  if (!customization) return 0;
  const locationCharge = /back|sleeve/i.test(customization.printLocation) ? 160 : 80;
  const methodCharge = /embroidery/i.test(customization.printMethod) ? 190 : 100;
  return locationCharge + methodCharge + Math.max(customization.layers.length - 1, 0) * 60 +
    (customization.rushDelivery ? 220 : 0) + (customization.embroidery ? 180 : 0);
}

async function purchasableItem(connection: PoolConnection, productId: string, variantId?: string) {
  if (!variantId) {
    const [products] = await connection.query<PurchasableRow[]>(
      `SELECT p.id AS product_id, p.name AS product_name, p.price, p.gst_percent,
              p.stock AS product_stock, NULL AS variant_id, p.sku AS variant_sku, NULL AS variant_stock
       FROM products p WHERE p.id = ? AND p.deleted_at IS NULL
         AND p.is_visible = 1 AND p.is_archived = 0 FOR UPDATE`, [productId]
    );
    if (!products[0]) throw new HttpError(409, "A selected product is no longer available.");
    return products[0];
  }
  const [rows] = await connection.query<PurchasableRow[]>(
    `SELECT p.id AS product_id, p.name AS product_name, p.price, p.gst_percent,
            p.stock AS product_stock, v.id AS variant_id, v.sku AS variant_sku, v.stock AS variant_stock
     FROM products p INNER JOIN product_variants v ON v.product_id = p.id
     WHERE p.id = ? AND v.id = ? AND p.deleted_at IS NULL
       AND p.is_visible = 1 AND p.is_archived = 0 FOR UPDATE`,
    [productId, variantId]
  );
  if (!rows[0]) throw new HttpError(409, "A selected product variant is no longer available.");
  return rows[0];
}

function serializeOrder(row: RowDataPacket, items: RowDataPacket[]) {
  return {
    id: row.id, orderNumber: row.order_number, invoiceNumber: row.invoice_number,
    createdAt: row.created_at, status: row.status, paymentStatus: row.payment_status,
    paymentMethod: row.payment_method, trackingNumber: row.tracking_number,
    subtotal: Number(row.subtotal), shipping: Number(row.shipping_amount),
    discount: Number(row.discount_amount), gst: Number(row.gst_amount), total: Number(row.total_amount),
    customerName: row.customer_name, customerEmail: row.customer_email, customerPhone: row.customer_phone,
    address: parseJsonValue(row.shipping_address, null),
    items: items.map((item) => ({
      id: item.id, productId: item.product_id, variantId: item.variant_id,
      selectedColor: item.selected_color, selectedSize: item.selected_size,
      productName: item.product_name, sku: item.sku, quantity: Number(item.quantity),
      price: Number(item.unit_price), total: Number(item.total_price),
      customization: parseJsonValue(item.customization, null)
    }))
  };
}

async function fetchOrder(orderNumber: string, email: string) {
  const [orders] = await pool.query<RowDataPacket[]>(
    `SELECT * FROM orders WHERE order_number = ? AND LOWER(customer_email) = LOWER(?)
     AND deleted_at IS NULL LIMIT 1`, [orderNumber, email]
  );
  if (!orders[0]) throw new HttpError(404, "Order not found. Check the order number and email address.");
  const [items] = await pool.query<RowDataPacket[]>(
    "SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at", [orders[0].id]
  );
  return serializeOrder(orders[0], items);
}

export const storeOrdersRouter = Router();

storeOrdersRouter.post("/", asyncHandler(async (request, response) => {
  const payload = createOrderSchema.parse(request.body);
  const reference = await withTransaction(async (connection) => {
    const pricedItems: Array<{ requested: z.infer<typeof createOrderSchema>["items"][number]; product: PurchasableRow; lineTotal: number }> = [];
    let subtotal = 0;
    let gst = 0;
    for (const requested of payload.items) {
      const product = await purchasableItem(connection, requested.productId, requested.variantId);
      if ((product.variant_stock != null && product.variant_stock < requested.quantity) || product.product_stock < requested.quantity) {
        throw new HttpError(409, `${product.product_name} does not have enough stock for this quantity.`);
      }
      if (requested.customization && requested.customization.productId !== requested.productId) {
        throw new HttpError(400, "Customisation does not match the selected product.");
      }
      const lineTotal = product.price * requested.quantity + customizationCharge(requested.customization);
      subtotal += lineTotal;
      gst += lineTotal - lineTotal / (1 + Number(product.gst_percent || 0) / 100);
      pricedItems.push({ requested, product, lineTotal });
    }

    let discount = 0;
    if (payload.couponCode) {
      const [couponRows] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM coupons WHERE UPPER(code) = UPPER(?) AND is_active = 1 AND deleted_at IS NULL
         AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())
         AND (usage_limit IS NULL OR usage_count < usage_limit) LIMIT 1 FOR UPDATE`, [payload.couponCode]
      );
      const coupon = couponRows[0];
      if (!coupon || subtotal < Number(coupon.minimum_order_value)) {
        throw new HttpError(400, "The coupon is invalid or its minimum order value has not been met.");
      }
      discount = coupon.discount_type === "percentage" ? subtotal * Number(coupon.value) / 100 : Number(coupon.value);
      if (coupon.maximum_discount != null) discount = Math.min(discount, Number(coupon.maximum_discount));
      discount = Math.round(discount);
      await connection.query("UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?", [coupon.id]);
    }

    const shipping = subtotal - discount >= 999 ? 0 : 99;
    const total = Math.max(0, subtotal + shipping - discount);
    const orderId = uuid();
    const token = `${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
    const orderNumber = `FAB${token}`;
    const invoiceNumber = `FAB-INV-${new Date().getFullYear()}-${token}`;
    await connection.query(
      `INSERT INTO orders (id, order_number, invoice_number, status, payment_status, payment_method,
        subtotal, shipping_amount, discount_amount, gst_amount, total_amount, customer_name,
        customer_email, customer_phone, shipping_address, stock_committed_at)
       VALUES (?, ?, ?, 'Confirmed', 'Pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [orderId, orderNumber, invoiceNumber, payload.paymentMethod, subtotal, shipping, discount,
        Math.round(gst * 100) / 100, total, payload.customer.name, payload.customer.email,
        payload.customer.phone, JSON.stringify(payload.address)]
    );
    for (const item of pricedItems) {
      await connection.query(
        `INSERT INTO order_items (id, order_id, product_id, variant_id, product_name, sku,
          selected_color, selected_size, quantity, unit_price, total_price, customization)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuid(), orderId, item.product.product_id, item.product.variant_id, item.product.product_name,
          item.product.variant_sku, item.requested.selectedColor ?? item.requested.customization?.productColor ?? null,
          item.requested.selectedSize ?? item.requested.customization?.size ?? null,
          item.requested.quantity, item.lineTotal / item.requested.quantity,
          item.lineTotal, item.requested.customization ? JSON.stringify(item.requested.customization) : null]
      );
      if (item.product.variant_id) {
        await connection.query("UPDATE product_variants SET stock = stock - ? WHERE id = ?", [item.requested.quantity, item.product.variant_id]);
        await connection.query("UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE variant_id = ?", [item.requested.quantity, item.product.variant_id]);
      } else {
        await connection.query("UPDATE inventory SET quantity = GREATEST(0, quantity - ?) WHERE product_id = ? AND variant_id IS NULL", [item.requested.quantity, item.product.product_id]);
      }
      await connection.query("UPDATE products SET stock = stock - ? WHERE id = ?", [item.requested.quantity, item.product.product_id]);
    }
    return { orderNumber, email: payload.customer.email };
  });
  response.status(201).json({ item: await fetchOrder(reference.orderNumber, reference.email) });
}));

storeOrdersRouter.get("/:orderNumber", asyncHandler(async (request, response) => {
  const email = z.string().email().parse(request.query.email);
  const orderNumber = z.string().trim().min(6).parse(request.params.orderNumber);
  response.json({ item: await fetchOrder(orderNumber, email) });
}));
