import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import type { RowDataPacket } from "mysql2/promise";
import { app } from "../src/app.js";
import { pool } from "../src/db/pool.js";
import { authenticateCustomer, authenticateGoogleCustomer, customerAuthCookieName, signCustomerToken } from "../src/modules/customer-auth/customer-auth.service.js";
import type { VerifiedGoogleIdentity } from "../src/modules/customer-auth/google-auth.service.js";

const runId = randomUUID();
const emailA = `isolation-a-${runId}@example.com`;
const emailB = `isolation-b-${runId}@example.com`;
const orderId = randomUUID();
const orderNumber = `ISO-${runId}`;
let server: Server | undefined;

function identity(suffix: string, email: string): VerifiedGoogleIdentity {
  return {
    subject: `google-isolation-${suffix}-${runId}`,
    email,
    name: `Isolation ${suffix}`,
    firstName: "Isolation",
    lastName: suffix,
    picture: `https://lh3.googleusercontent.com/a/${suffix.toLowerCase()}-avatar`
  };
}

async function main() {
  const customerA = await authenticateGoogleCustomer(identity("A", emailA));
  const customerB = await authenticateGoogleCustomer(identity("B", emailB));
  assert.notEqual(customerA.id, customerB.id);
  assert.equal(customerA.hasPassword, false);
  assert.equal(customerB.hasPassword, false);

  const [[product]] = await pool.query<Array<RowDataPacket & { id: string }>>(
    "SELECT id FROM products WHERE deleted_at IS NULL AND is_visible=1 LIMIT 1"
  );
  const [[custom]] = await pool.query<Array<RowDataPacket & { productId: string; colourId: string; methodId: string | null; sizeName: string }>>(
    `SELECT p.id productId,c.id colourId,m.id methodId,s.name sizeName
     FROM custom_products p
     JOIN custom_product_colours c ON c.product_id=p.id AND c.is_active=1
     JOIN custom_product_sizes s ON s.product_id=p.id AND s.is_active=1
     LEFT JOIN custom_printing_methods m ON m.is_active=1
     WHERE p.deleted_at IS NULL AND p.is_active=1 LIMIT 1`
  );
  assert.ok(product?.id, "A visible product is required for the wishlist isolation test.");
  assert.ok(custom?.productId, "A configured custom product is required for the design isolation test.");

  await pool.query(
    `INSERT INTO orders
      (id,user_id,shipping_address,order_number,status,payment_status,payment_method,subtotal,shipping_amount,discount_amount,gst_amount,total_amount,customer_name,customer_email,customer_phone)
     VALUES (?, ?, ?, ?, 'Confirmed', 'Paid', 'test', 100, 0, 0, 0, 100, ?, ?, '')`,
    [orderId, customerA.id, JSON.stringify({ recipient: customerA.name, city: "Test" }), orderNumber, customerA.name, customerA.email]
  );

  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
  });
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}/api`;
  const tokenA = signCustomerToken(customerA);
  const tokenB = signCustomerToken(customerB);
  const cookieA = `${customerAuthCookieName}=${tokenA}`;
  const cookieB = `${customerAuthCookieName}=${tokenB}`;

  const request = async (path: string, cookie?: string, options: RequestInit = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...(options.headers ?? {}) }
    });
    const text = await response.text();
    let body: Record<string, unknown> = {};
    try { body = text ? JSON.parse(text) as Record<string, unknown> : {}; } catch { body = {}; }
    return { response, body };
  };

  let result = await request("/customer/account/addresses", cookieA, {
    method: "POST",
    body: JSON.stringify({ label:"Home",recipient:customerA.name,phone:"9876543210",line1:"1 Isolation Street",line2:"",landmark:"",city:"Mumbai",state:"Maharashtra",pinCode:"400053",country:"India",isDefault:true })
  });
  assert.equal(result.response.status, 201);
  const addressId = String((result.body.items as Array<{ id: string }>)[0].id);

  result = await request("/customer/account/wishlist", cookieA, { method: "POST", body: JSON.stringify({ productId: product.id }) });
  assert.equal(result.response.status, 201);
  result = await request("/customer/account/designs", cookieA, {
    method: "POST",
    body: JSON.stringify({ customProductId:custom.productId,customColourId:custom.colourId,selectedSize:custom.sizeName,printingMethodId:custom.methodId,title:"Isolation design",designData:{states:{}},previewUrl:null })
  });
  assert.equal(result.response.status, 201);
  const designId = String((result.body.item as { id: string }).id);

  const summaryA = await request("/customer/account/summary", cookieA);
  const summaryB = await request("/customer/account/summary", cookieB);
  assert.deepEqual(summaryA.body.item, { orders:1,wishlist:1,designs:1,addresses:1 });
  assert.deepEqual(summaryB.body.item, { orders:0,wishlist:0,designs:0,addresses:0 });

  for (const resource of ["orders", "wishlist", "designs", "addresses"]) {
    const listA = await request(`/customer/account/${resource}`, cookieA);
    const listB = await request(`/customer/account/${resource}`, cookieB);
    assert.equal((listA.body.items as unknown[]).length, 1, `${resource}: customer A should see one record.`);
    assert.equal((listB.body.items as unknown[]).length, 0, `${resource}: customer B must not see customer A records.`);
  }

  result = await request(`/customer/account/addresses/${addressId}`, cookieB, {
    method: "PUT",
    body: JSON.stringify({ label:"Home",recipient:customerB.name,phone:"9876543210",line1:"2 Wrong Street",line2:"",landmark:"",city:"Mumbai",state:"Maharashtra",pinCode:"400053",country:"India",isDefault:true })
  });
  assert.equal(result.response.status, 404, "Customer B must not update customer A's address.");
  result = await request(`/customer/account/designs/${designId}`, cookieB, {
    method: "PUT",
    body: JSON.stringify({ customProductId:custom.productId,customColourId:custom.colourId,selectedSize:custom.sizeName,printingMethodId:custom.methodId,title:"Wrong owner",designData:{states:{}},previewUrl:null })
  });
  assert.equal(result.response.status, 404, "Customer B must not update customer A's design.");
  await request(`/customer/account/wishlist/${product.id}`, cookieB, { method: "DELETE" });
  result = await request("/customer/account/wishlist", cookieA);
  assert.equal((result.body.items as unknown[]).length, 1, "Customer B must not remove customer A's wishlist item.");

  result = await request("/customer/auth/set-password-request", cookieA, { method: "POST" });
  assert.equal(result.response.status, 200);
  const setupUrl = String(result.body.developmentResetUrl ?? "");
  assert.ok(setupUrl, "Development password setup must return its verification link.");
  const resetToken = new URL(setupUrl).searchParams.get("token");
  assert.ok(resetToken);
  result = await request("/customer/auth/reset-password", undefined, { method:"POST", body:JSON.stringify({ token:resetToken,password:"Isolation123",confirmPassword:"Isolation123" }) });
  assert.equal(result.response.status, 200);
  assert.equal((await authenticateCustomer(emailA, "Isolation123")).hasPassword, true);

  result = await request("/customer/auth/login", undefined, { method:"POST", body:JSON.stringify({ email:emailA,password:"Isolation123" }) });
  assert.equal(result.response.status, 200);
  const setCookie = result.response.headers.get("set-cookie") ?? "";
  assert.match(setCookie, /customer_token=/);
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /SameSite=Lax/i);
  const refreshedCookie = setCookie.split(";")[0];
  const refreshOne = await request("/customer/auth/me", refreshedCookie);
  const refreshTwo = await request("/customer/auth/me", refreshedCookie);
  assert.equal(refreshOne.response.status, 200);
  assert.equal(refreshTwo.response.status, 200);
  assert.equal((refreshTwo.body.customer as { id: string }).id, customerA.id);

  const logout = await request("/customer/auth/logout", refreshedCookie, { method: "POST" });
  assert.equal(logout.response.status, 204);
  assert.match(logout.response.headers.get("set-cookie") ?? "", /customer_token=;/);
  assert.equal((await request("/customer/auth/me", refreshedCookie)).response.status, 401, "Logout must revoke the previous JWT.");
  assert.equal((await request("/customer/account/summary", refreshedCookie)).response.status, 401, "Protected account APIs must reject a logged-out session.");

  const [stored] = await pool.query<RowDataPacket[]>(
    "SELECT id,email,google_subject,avatar_url,password_hash FROM users WHERE id IN (?,?) ORDER BY email",
    [customerA.id, customerB.id]
  );
  assert.equal(stored.length, 2, "Both Google customers must be stored in the existing users table.");
  assert.ok(stored.every((row) => row.google_subject && row.avatar_url));
  console.log("Customer session, persistence, counts, ownership, set-password, and isolation tests passed.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  await pool.query("DELETE FROM orders WHERE id=?", [orderId]);
  await pool.query("DELETE FROM custom_designs WHERE user_id IN (SELECT id FROM users WHERE email IN (?,?))", [emailA,emailB]);
  await pool.query("DELETE FROM users WHERE email IN (?,?)", [emailA,emailB]);
  await pool.end();
});
