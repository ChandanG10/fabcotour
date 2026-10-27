import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { RowDataPacket } from "mysql2/promise";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { pool } from "../src/db/pool.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function callbackHash(payload: Record<string, string>, salt: string) {
  const base = [
    salt, payload.status, "", "", "", "", "", payload.udf5, payload.udf4, payload.udf3,
    payload.udf2, payload.udf1, payload.email, payload.firstname, payload.productinfo,
    payload.amount, payload.txnid, payload.key
  ].join("|");
  return createHash("sha512").update(base, "utf8").digest("hex");
}

async function postForm(url: string, payload: Record<string, string>) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payload),
    redirect: "manual"
  });
}

async function main() {
  const key = env.PAYU_MERCHANT_KEY?.trim();
  const salt = env.PAYU_SALT?.trim();
  assert(key && salt, "PAYU_MERCHANT_KEY and PAYU_SALT are required for the PayU integration test.");

  let orderId: string | undefined;
  let orderNumber = "";
  let server: Server | undefined;
  try {
    const [products] = await pool.query<RowDataPacket[]>(
      `SELECT p.id FROM products p WHERE p.deleted_at IS NULL AND p.is_visible = 1
       AND p.is_archived = 0 AND p.stock > 0
       AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.deleted_at IS NULL)
       ORDER BY p.created_at DESC LIMIT 1`
    );
    const productId = String(products[0]?.id ?? "");
    assert(productId, "A purchasable product without variants is required for the checkout integration test.");

    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server?.once("listening", resolve);
      server?.once("error", reject);
    });
    const port = (server.address() as AddressInfo).port;
    const apiRoot = `http://127.0.0.1:${port}/api`;

    const createOrder = await fetch(`${apiRoot}/store/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: { name: "PayU Test Customer", email: "payu-test@example.com", phone: "9999999999" },
        address: {
          id: "payu-test-address", label: "Test", recipient: "PayU Test Customer", phone: "9999999999",
          line1: "1 Test Street", city: "Bengaluru", state: "Karnataka", pinCode: "560001", country: "India"
        },
        paymentMethod: "payu",
        items: [{ type: "STANDARD_PRODUCT", productId, selectedColor: "Default", selectedSize: "One Size", quantity: 1 }]
      })
    });
    const created = await createOrder.json() as { item?: { id: string; orderNumber: string; total: number; status: string; paymentStatus: string; paymentMethod: string }; message?: string };
    assert(createOrder.status === 201 && created.item, `Store order creation failed with ${createOrder.status}: ${created.message ?? "unknown error"}`);
    orderId = created.item.id;
    orderNumber = created.item.orderNumber;
    assert(created.item.status === "Pending" && created.item.paymentStatus === "Pending" && created.item.paymentMethod === "payu", "PayU order was not created in the required pending state.");
    const [createdRows] = await pool.query<RowDataPacket[]>("SELECT payment_gateway FROM orders WHERE id = ?", [orderId]);
    assert(createdRows[0]?.payment_gateway === "payu", "PayU order did not save payment_gateway=payu at creation.");

    const initiate = await fetch(`${apiRoot}/payu/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    });
    assert(initiate.ok, `Initial PayU initiation failed with ${initiate.status}.`);
    const first = await initiate.json() as { action: string; params: Record<string, string> };
    assert(first.action === "https://test.payu.in/_payment", "PayU test action URL is incorrect.");
    assert(first.params.amount === Number(created.item.total).toFixed(2) && first.params.udf1 === orderId, "Initiation did not use the stored order amount and ID.");
    assert(!JSON.stringify(first).includes(salt), "The PayU salt leaked in the initiation response.");

    const invalidHashPayload: Record<string, string> = { ...first.params, status: "failure", mihpayid: "TEST-INVALID-1", hash: "0".repeat(128) };
    const invalidHash = await postForm(`${apiRoot}/payu/failure`, invalidHashPayload);
    assert(invalidHash.status === 400, "An invalid callback hash was accepted.");

    const wrongAmountPayload: Record<string, string> = { ...first.params, amount: "999.99", status: "failure", mihpayid: "TEST-AMOUNT-1" };
    wrongAmountPayload.hash = callbackHash(wrongAmountPayload, salt);
    const wrongAmount = await postForm(`${apiRoot}/payu/failure`, wrongAmountPayload);
    assert(wrongAmount.status === 400, "A signed callback with the wrong order amount was accepted.");

    const failedPayload: Record<string, string> = { ...first.params, status: "failure", mihpayid: "TEST-FAIL-1", error_Message: "Test failure" };
    failedPayload.hash = callbackHash(failedPayload, salt);
    const failed = await postForm(`${apiRoot}/payu/failure`, failedPayload);
    assert(failed.status === 303, `Failure callback returned ${failed.status}.`);
    const [failedRows] = await pool.query<Array<RowDataPacket & { payment_status: string }>>(
      "SELECT payment_status FROM orders WHERE id = ?", [orderId]
    );
    assert(failedRows[0]?.payment_status === "Failed", "Verified failure did not mark the order failed.");

    const retry = await fetch(`${apiRoot}/payu/initiate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId })
    });
    assert(retry.ok, `PayU retry initiation failed with ${retry.status}.`);
    const second = await retry.json() as { action: string; params: Record<string, string> };
    assert(second.params.txnid !== first.params.txnid, "Retry reused the previous PayU transaction ID.");

    const successPayload: Record<string, string> = { ...second.params, status: "success", mihpayid: "TEST-SUCCESS-1" };
    successPayload.hash = callbackHash(successPayload, salt);
    const success = await postForm(`${apiRoot}/payu/success`, successPayload);
    assert(success.status === 303, `Success callback returned ${success.status}.`);
    const [paidRows] = await pool.query<RowDataPacket[]>(
      `SELECT status, payment_status, payment_gateway, payment_transaction_id, payu_payment_id, paid_at
       FROM orders WHERE id = ?`, [orderId]
    );
    const paid = paidRows[0];
    assert(paid?.status === "Confirmed" && paid.payment_status === "Paid", "Verified success did not confirm and pay the order.");
    assert(paid.payment_gateway === "payu" && paid.payment_transaction_id === second.params.txnid, "PayU transaction metadata was not saved.");
    assert(paid.payu_payment_id === "TEST-SUCCESS-1" && paid.paid_at, "PayU payment ID or paid date was not saved.");

    const webhook = await postForm(`${apiRoot}/payu/webhook`, successPayload);
    assert(webhook.status === 200, `Idempotent webhook returned ${webhook.status}.`);
    const statusResponse = await fetch(`${apiRoot}/payu/status/${orderId}`);
    const statusBody = await statusResponse.json() as { item?: { orderNumber?: string; paymentStatus?: string } };
    assert(statusResponse.ok && statusBody.item?.orderNumber === orderNumber && statusBody.item.paymentStatus === "Paid", "Payment status lookup did not return the verified paid order.");

    const replayedFailure: Record<string, string> = { ...successPayload, status: "failure", error_Message: "Late duplicate failure" };
    replayedFailure.hash = callbackHash(replayedFailure, salt);
    const replay = await postForm(`${apiRoot}/payu/failure`, replayedFailure);
    assert(replay.status === 303 && replay.headers.get("location")?.includes("/payment-success"), "A late failure overrode a successful payment.");
    const [replayedRows] = await pool.query<Array<RowDataPacket & { payment_status: string }>>(
      "SELECT payment_status FROM orders WHERE id = ?", [orderId]
    );
    assert(replayedRows[0]?.payment_status === "Paid", "Idempotent replay changed a paid order.");

    console.log("PayU flow verified: store order creation, initiate, failure, retry, success, metadata, and idempotent replay.");
  } finally {
    if (server) await new Promise<void>((resolve) => server?.close(() => resolve()));
    if (orderId) {
      const [items] = await pool.query<RowDataPacket[]>("SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = ?", [orderId]);
      for (const item of items) {
        if (item.variant_id) {
          await pool.query("UPDATE product_variants SET stock = stock + ? WHERE id = ?", [item.quantity, item.variant_id]);
          await pool.query("UPDATE inventory SET quantity = quantity + ? WHERE variant_id = ?", [item.quantity, item.variant_id]);
        }
        if (item.product_id) {
          await pool.query("UPDATE products SET stock = stock + ? WHERE id = ?", [item.quantity, item.product_id]);
          if (!item.variant_id) await pool.query("UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND variant_id IS NULL", [item.quantity, item.product_id]);
        }
      }
      await pool.query("DELETE FROM orders WHERE id = ?", [orderId]);
    }
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "PayU integration test failed.");
  process.exitCode = 1;
});
