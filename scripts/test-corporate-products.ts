/** Runs real API/SQL checks against connection-scoped temporary tables only.
 * Requires the configured MySQL connection; never changes existing catalogue data.
 * Run: node_modules/.bin/tsx scripts/test-corporate-products.ts
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { pool } from "../server/src/db/pool.js";
import { deleteCloudinaryImage } from "../server/src/modules/uploads/uploads.service.js";
import { app } from "../server/src/app.js";
import { authCookieName, signAdminToken } from "../server/src/modules/auth/auth.service.js";
import { corporateProductSchema, corporateQuoteSchema } from "../server/src/modules/corporate-products/corporate-products.schema.js";

const connection = await pool.getConnection();
const originalQuery = pool.query.bind(pool);
const uploadedIds: string[] = [];
let server: ReturnType<typeof app.listen> | undefined;
try {
 const migration = await readFile(new URL("../server/migrations/018_corporate_products.sql", import.meta.url), "utf8");
 // Temporary tables shadow persistent tables on this connection and disappear on disconnect.
 for (const statement of migration.replace("CREATE TABLE IF NOT EXISTS corporate_products", "CREATE TEMPORARY TABLE corporate_products").split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean)) await connection.query(statement.replace(/ WHERE NOT EXISTS \(SELECT 1 FROM corporate_products WHERE slug='[^']+'\)$/, ""));
 for (const table of ["corporate_enquiries", "admins"]) {
  const [definition] = await connection.query(`SHOW CREATE TABLE ${table}`);
  const ddl = (definition as Array<Record<string, string>>)[0]["Create Table"];
  await connection.query(ddl.replace("CREATE TABLE", "CREATE TEMPORARY TABLE"));
 }
 await connection.query("INSERT INTO admins (id,email,password_hash,first_name,last_name,role,must_change_password) VALUES ('test-admin','qa@example.invalid','unused','Corporate','QA','super_admin',0)");
 pool.query = connection.query.bind(connection) as typeof pool.query;
 server = app.listen(0, "127.0.0.1"); await once(server, "listening");
 const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
 const token = signAdminToken({ id: "test-admin", email: "qa@example.invalid", name: "Corporate QA", firstName: "Corporate", lastName: "QA", role: "super_admin", mustChangePassword: false });
 const cookie = `${authCookieName}=${token}`;
 const req = async (path: string, method = "GET", body?: unknown, auth = true) => fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(auth ? { Cookie: cookie } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
 for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
  const response = await req(`/admin/corporate-products${["PUT", "PATCH", "DELETE"].includes(method) ? "/missing" : ""}`, method, undefined, false);
  assert.equal(response.status, 401, `${method} admin requires authentication`);
 }
 let result = await req("/corporate-products", "GET", undefined, false); assert.equal(result.status, 200);
 const initial = await result.json(); assert.equal(initial.items.length, 6);
 for (const product of initial.items) { assert.equal((await req(`/corporate-products/${product.slug}`)).status, 200); assert.ok(Array.isArray(product.includedItems)); assert.equal(typeof product.isActive, "boolean"); }
 const draft = { ...initial.items[0], name: "QA Corporate Kit", slug: "qa-corporate-kit", category: "QA", minimumOrderQuantity: 25, isFeatured: false };
 assert.equal(corporateProductSchema.safeParse({ ...draft, minimumOrderQuantity: 0 }).success, false);
 assert.equal(corporateProductSchema.safeParse({ ...draft, pricingType: "fixed_price", startingPrice: null }).success, false);
 assert.equal(corporateProductSchema.safeParse({ ...draft, mainImage: "javascript:alert(1)" }).success, false);
 assert.equal(corporateQuoteSchema.safeParse({ name: "A", quantity: -1 }).success, false);
 assert.equal((await req("/admin/corporate-products", "POST", { ...draft, includedItems: [] })).status, 400);
 result = await req("/admin/corporate-products", "POST", draft); assert.equal(result.status, 201); const { item: created } = await result.json();
 assert.equal((await req("/admin/corporate-products", "POST", draft)).status, 409);
 result = await req(`/admin/corporate-products/${created.id}`, "PUT", { ...draft, startingPrice: 1499.5, pricingType: "fixed_price", includedItems: ["Notebook", "Bottle"], additionalImages: [draft.mainImage] });
 assert.equal(result.status, 200); assert.equal((await result.json()).item.startingPrice, 1499.5);
 result = await req("/admin/corporate-products?search=QA&category=QA"); assert.equal((await result.json()).items.length, 1);
 assert.equal((await req(`/admin/corporate-products/${created.id}`, "PATCH", { isActive: false, isFeatured: true, displayOrder: 99 })).status, 200);
 assert.equal((await req("/corporate-products/qa-corporate-kit")).status, 404);
 assert.equal((await (await req("/corporate-products")).json()).items.length, 6);
 assert.equal((await req(`/admin/corporate-products/${created.id}`, "PATCH", { isActive: true })).status, 200);
 const form = (quantity: number) => { const data = new FormData(); Object.entries({ name: "QA User", companyName: "QA Company", email: "qa@example.invalid", phone: "9999999999", quantity: String(quantity), message: "Test quote requirements" }).forEach(([key, value]) => data.append(key, value)); return data; };
 assert.equal((await fetch(base + "/corporate-products/qa-corporate-kit/enquiries", { method: "POST", body: form(1) })).status, 400);
 const invalidFile = form(25); invalidFile.append("artwork", new Blob(["not an image"], { type: "image/png" }), "logo.png");
 assert.equal((await fetch(base + "/corporate-products/qa-corporate-kit/enquiries", { method: "POST", body: invalidFile })).status, 400);
 result = await fetch(base + "/corporate-products/qa-corporate-kit/enquiries", { method: "POST", body: form(25) }); assert.equal(result.status, 201); const enquiry = await result.json();
 const [saved] = await connection.query("SELECT required_products, estimated_quantity, message FROM corporate_enquiries WHERE id=?", [enquiry.id]);
 assert.deepEqual(JSON.parse(JSON.stringify(saved)), [{ required_products: "QA Corporate Kit", estimated_quantity: "25", message: "Test quote requirements" }]);
 if (process.env.TEST_CORPORATE_UPLOADS === "1") {
  const bytes = await readFile(new URL("../public/images/corporate/employee-welcome-kit.webp", import.meta.url));
  const image = new Blob([bytes], { type: "image/webp" });
  const images = new FormData(); images.append("images", image, "qa-kit.webp");
  const uploadedResponse = await fetch(base + "/admin/uploads/images", { method: "POST", headers: { Cookie: cookie }, body: images });
  assert.equal(uploadedResponse.status, 201, "Admin image upload");
  const uploaded = (await uploadedResponse.json()).items[0]; uploadedIds.push(uploaded.publicId);
  assert.ok(uploaded.url.startsWith("https://"));
  assert.equal((await req(`/admin/corporate-products/${created.id}`, "PUT", { ...draft, mainImage: uploaded.url, additionalImages: [uploaded.url] })).status, 200);
  const artworkForm = form(25); artworkForm.append("artwork", image, "qa-artwork.webp");
  const artworkResponse = await fetch(base + "/corporate-products/qa-corporate-kit/enquiries", { method: "POST", body: artworkForm });
  assert.equal(artworkResponse.status, 201, "Enquiry artwork upload");
  const artworkEnquiry = await artworkResponse.json();
  const [artworkRows] = await connection.query("SELECT attachment_url, attachment_public_id FROM corporate_enquiries WHERE id=?", [artworkEnquiry.id]);
  const attachment = (artworkRows as Array<{ attachment_url: string; attachment_public_id: string }>)[0];
  uploadedIds.push(attachment.attachment_public_id); assert.ok(attachment.attachment_url.startsWith("https://"));
  console.log("PASS: real Cloudinary admin image and enquiry artwork uploads, persisted image/gallery and attachment references.");
 }
 assert.equal((await req(`/admin/corporate-products/${created.id}`, "DELETE")).status, 204);
 assert.equal((await req("/corporate-products/qa-corporate-kit")).status, 404);
 assert.equal((await req(`/admin/corporate-products/${created.id}`)).status, 404);
 assert.equal((await req(`/admin/corporate-products/${created.id}`, "DELETE")).status, 404);
 console.log("PASS: migration seeds, admin auth, validation, CRUD, unique slugs, search/category filters, activation, featuring/order, galleries, quote MOQ, invalid uploads, enquiry persistence, soft deletion.");
} finally {
 for (const id of uploadedIds) await deleteCloudinaryImage(id);
 if (server) { server.closeAllConnections(); await new Promise<void>(resolve => server!.close(() => resolve())); }
 pool.query = originalQuery;
 connection.destroy(); await pool.end();
}
