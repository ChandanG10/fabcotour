import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type Request } from "express";
import type { RowDataPacket } from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { env } from "../../config/env.js";
import { pool, withTransaction } from "../../db/pool.js";
import { asyncHandler, HttpError } from "../../utils/http.js";

type PayuPayload = Record<string, string>;

interface PayuOrderRow extends RowDataPacket {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_transaction_id: string | null;
  total_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
}

interface PayuTransactionRow extends RowDataPacket {
  order_id: string;
  txnid: string;
  amount: number;
  status: "pending" | "success" | "failed";
}

const initiateSchema = z.object({ orderId: z.string().uuid() });

function payuCredentials() {
  const key = env.PAYU_MERCHANT_KEY?.trim();
  const salt = env.PAYU_SALT?.trim();
  if (!key || !salt) {
    throw new HttpError(503, "PayU is not configured.");
  }
  return { key, salt };
}

function sha512(value: string) {
  return createHash("sha512").update(value, "utf8").digest("hex");
}

function requestHash(fields: PayuPayload, salt: string) {
  return sha512([
    fields.key, fields.txnid, fields.amount, fields.productinfo, fields.firstname, fields.email,
    fields.udf1, fields.udf2, fields.udf3, fields.udf4, fields.udf5, "", "", "", "", "", salt
  ].join("|"));
}

function responseHash(payload: PayuPayload, salt: string) {
  const base = [
    salt, payload.status, "", "", "", "", "", payload.udf5, payload.udf4, payload.udf3,
    payload.udf2, payload.udf1, payload.email, payload.firstname, payload.productinfo,
    payload.amount, payload.txnid, payload.key
  ].join("|");
  const additionalCharges = payload.additionalCharges || payload.additional_charges;
  return sha512(additionalCharges ? `${additionalCharges}|${base}` : base);
}

function secureHashMatch(received: string, expected: string) {
  if (!/^[a-f0-9]{128}$/i.test(received)) return false;
  return timingSafeEqual(Buffer.from(received.toLowerCase(), "hex"), Buffer.from(expected, "hex"));
}

function stringPayload(request: Request): PayuPayload {
  if (!request.body || typeof request.body !== "object" || Array.isArray(request.body)) {
    throw new HttpError(400, "Invalid PayU response.");
  }
  return Object.fromEntries(
    Object.entries(request.body as Record<string, unknown>).map(([key, value]) => [key, typeof value === "string" ? value : ""])
  );
}

function baseUrl(value: string | undefined, fallback: string) {
  return (value?.trim() || fallback).replace(/\/+$/, "");
}

function frontendUrl() {
  return baseUrl(env.FRONTEND_URL, env.APP_ORIGIN || "http://localhost:5173");
}

function backendUrl(request: Request) {
  return baseUrl(env.BACKEND_URL, `${request.protocol}://${request.get("host")}`);
}

function redirectToResult(request: Request, route: "/payment-success" | "/payment-failed", order: PayuOrderRow) {
  const url = new URL(route, `${frontendUrl()}/`);
  url.searchParams.set("orderId", order.id);
  url.searchParams.set("orderNumber", order.order_number);
  return url.toString();
}

async function processPayuResponse(request: Request) {
  const payload = stringPayload(request);
  const { key, salt } = payuCredentials();
  const required = ["key", "txnid", "amount", "productinfo", "firstname", "email", "status", "hash"];
  if (required.some((field) => !payload[field])) throw new HttpError(400, "PayU response is incomplete.");
  if (payload.key !== key || !secureHashMatch(payload.hash, responseHash(payload, salt))) {
    throw new HttpError(400, "PayU response verification failed.");
  }

  return withTransaction(async (connection) => {
    const [transactions] = await connection.query<PayuTransactionRow[]>(
      `SELECT order_id, txnid, amount, status FROM payu_transactions WHERE txnid = ? LIMIT 1 FOR UPDATE`,
      [payload.txnid]
    );
    const transaction = transactions[0];
    if (!transaction) throw new HttpError(404, "PayU transaction was not found.");

    const [orders] = await connection.query<PayuOrderRow[]>(
      `SELECT id, order_number, status, payment_status, payment_transaction_id, total_amount,
        customer_name, customer_email, customer_phone
       FROM orders WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
      [transaction.order_id]
    );
    const order = orders[0];
    if (!order) throw new HttpError(404, "Order was not found.");

    const expectedAmount = Number(transaction.amount).toFixed(2);
    if (Number(order.total_amount).toFixed(2) !== expectedAmount || Number(payload.amount).toFixed(2) !== expectedAmount) {
      throw new HttpError(400, "PayU amount verification failed.");
    }
    if (payload.udf1 !== order.id || payload.udf2 !== order.order_number) {
      throw new HttpError(400, "PayU order verification failed.");
    }

    const succeeded = payload.status.toLowerCase() === "success";
    const mihpayid = payload.mihpayid?.slice(0, 120) || null;
    if (succeeded) {
      await connection.query(
        `UPDATE payu_transactions SET status = 'success', payu_payment_id = ?, failure_reason = NULL,
          completed_at = COALESCE(completed_at, NOW()) WHERE txnid = ?`,
        [mihpayid, payload.txnid]
      );
      if (order.payment_status !== "Paid") {
        await connection.query(
          `UPDATE orders SET payment_status = 'Paid', payment_method = 'payu',
            payment_gateway = 'payu', payment_provider = 'payu', payment_transaction_id = ?,
            payment_order_id = ?, payu_payment_id = ?, payment_id = ?, status = 'Confirmed',
            paid_at = COALESCE(paid_at, NOW()) WHERE id = ?`,
          [payload.txnid, payload.txnid, mihpayid, mihpayid, order.id]
        );
      }
    } else {
      await connection.query(
        `UPDATE payu_transactions SET status = 'failed', payu_payment_id = ?, failure_reason = ?,
          completed_at = COALESCE(completed_at, NOW()) WHERE txnid = ? AND status <> 'success'`,
        [mihpayid, (payload.error_Message || payload.field9 || payload.status).slice(0, 255), payload.txnid]
      );
      if (order.payment_status !== "Paid" && order.payment_transaction_id === payload.txnid) {
        await connection.query(`UPDATE orders SET payment_status = 'Failed' WHERE id = ?`, [order.id]);
      }
    }

    return { order, succeeded: succeeded || order.payment_status === "Paid" || transaction.status === "success" };
  });
}

export const payuRouter = Router();

payuRouter.get("/status/:orderId", asyncHandler(async (request, response) => {
  const orderId = z.string().uuid().parse(request.params.orderId);
  const [orders] = await pool.query<RowDataPacket[]>(
    `SELECT order_number, status, payment_status FROM orders
     WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [orderId]
  );
  const order = orders[0];
  if (!order) throw new HttpError(404, "Order was not found.");
  response.json({
    item: {
      orderNumber: String(order.order_number),
      orderStatus: String(order.status),
      paymentStatus: String(order.payment_status)
    }
  });
}));

payuRouter.post("/initiate", asyncHandler(async (request, response) => {
  const { orderId } = initiateSchema.parse(request.body);
  const { key, salt } = payuCredentials();
  const result = await withTransaction(async (connection) => {
    const [orders] = await connection.query<PayuOrderRow[]>(
      `SELECT id, order_number, status, payment_status, payment_transaction_id, total_amount,
        customer_name, customer_email, customer_phone
       FROM orders WHERE id = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
      [orderId]
    );
    const order = orders[0];
    if (!order) throw new HttpError(404, "Order was not found.");
    if (order.payment_status === "Paid") throw new HttpError(409, "This order is already paid.");
    if (["Cancelled", "Returned"].includes(order.status)) throw new HttpError(409, "This order cannot be paid.");
    if (Number(order.total_amount) <= 0) throw new HttpError(409, "This order has no payable balance.");

    const txnid = `FP${Date.now().toString(36)}${randomBytes(5).toString("hex")}`.slice(0, 25);
    const amount = Number(order.total_amount).toFixed(2);
    const callbackRoot = backendUrl(request);
    const fields: PayuPayload = {
      key,
      txnid,
      amount,
      productinfo: `FabPodd order ${order.order_number}`,
      firstname: order.customer_name.trim().split(/\s+/)[0]?.slice(0, 60) || "Customer",
      email: order.customer_email,
      phone: order.customer_phone || "",
      surl: `${callbackRoot}/api/payu/success`,
      furl: `${callbackRoot}/api/payu/failure`,
      udf1: order.id,
      udf2: order.order_number,
      udf3: "",
      udf4: "",
      udf5: ""
    };
    fields.hash = requestHash(fields, salt);

    await connection.query(
      `INSERT INTO payu_transactions (id, order_id, txnid, amount, status) VALUES (?, ?, ?, ?, 'pending')`,
      [uuid(), order.id, txnid, amount]
    );
    await connection.query(
      `UPDATE orders SET payment_status = 'Pending', payment_method = 'payu',
        payment_gateway = 'payu', payment_provider = 'payu', payment_transaction_id = ?,
        payment_order_id = ?, payu_payment_id = NULL, payment_id = NULL WHERE id = ?`,
      [txnid, txnid, order.id]
    );
    return fields;
  });

  response.json({
    action: env.PAYU_ENV === "production" ? "https://secure.payu.in/_payment" : "https://test.payu.in/_payment",
    params: result
  });
}));

payuRouter.post("/success", asyncHandler(async (request, response) => {
  const result = await processPayuResponse(request);
  response.redirect(303, redirectToResult(request, result.succeeded ? "/payment-success" : "/payment-failed", result.order));
}));

payuRouter.post("/failure", asyncHandler(async (request, response) => {
  const result = await processPayuResponse(request);
  response.redirect(303, redirectToResult(request, result.succeeded ? "/payment-success" : "/payment-failed", result.order));
}));

payuRouter.post("/webhook", asyncHandler(async (request, response) => {
  const result = await processPayuResponse(request);
  response.status(200).json({ success: true, paymentStatus: result.succeeded ? "paid" : "failed" });
}));
