import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import type { CookieOptions, Request, Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { RowDataPacket } from "mysql2/promise";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env.js";
import { pool, withTransaction } from "../../db/pool.js";
import { HttpError } from "../../utils/http.js";
import type { VerifiedGoogleIdentity } from "./google-auth.service.js";

export interface AuthenticatedCustomer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: "customer" | "business";
  avatar: string;
  addresses: CustomerAddress[];
  sessionVersion: number;
  hasPassword: boolean;
  googleLinked: boolean;
}

export interface CustomerAddress {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault: boolean;
}

interface CustomerRow extends RowDataPacket {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  password_hash: string | null;
  role: "customer" | "business";
  avatar_url: string | null;
  session_version: number;
  google_subject: string | null;
}

const cookieName = "customer_token";

function isLocalRequest(request: Request) {
  return ["localhost", "127.0.0.1", "::1"].includes(request.hostname);
}

function customerCookieOptions(request: Request): CookieOptions {
  const crossSiteCookie = !isLocalRequest(request);
  return {
    httpOnly: true,
    sameSite: crossSiteCookie ? "none" : "lax",
    secure: crossSiteCookie,
    partitioned: crossSiteCookie,
    path: "/",
    maxAge: 30 * 24 * 60 * 60 * 1000
  };
}

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  return { firstName: parts.shift() || "Customer", lastName: parts.join(" ") };
}

function resetTokenHash(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function shouldRefreshGoogleAvatar(currentAvatar: string | null, nextAvatar: string | null) {
  if (!nextAvatar) return false;
  if (!currentAvatar) return true;
  try {
    return new URL(currentAvatar).hostname === "lh3.googleusercontent.com";
  } catch {
    return false;
  }
}

async function associateExistingOrders(userId: string, email: string) {
  await pool.query(
    "UPDATE orders SET user_id = ? WHERE user_id IS NULL AND deleted_at IS NULL AND LOWER(customer_email) = LOWER(?)",
    [userId, email.trim()]
  );
}

async function customerAddresses(userId: string): Promise<CustomerAddress[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, label, recipient, phone, line1, line2, landmark, city, state, pin_code, country, is_default
     FROM addresses WHERE user_id = ? AND deleted_at IS NULL ORDER BY is_default DESC, created_at DESC`,
    [userId]
  );
  return rows.map((row) => ({
    id: String(row.id), label: String(row.label), recipient: String(row.recipient), phone: String(row.phone),
    line1: String(row.line1), line2: row.line2 ? String(row.line2) : undefined,
    landmark: row.landmark ? String(row.landmark) : undefined, city: String(row.city), state: String(row.state),
    pinCode: String(row.pin_code), country: String(row.country), isDefault: Boolean(row.is_default)
  }));
}

async function serializeCustomer(row: CustomerRow): Promise<AuthenticatedCustomer> {
  const lastName = row.last_name ?? "";
  return {
    id: row.id,
    name: `${row.first_name} ${lastName}`.trim(),
    firstName: row.first_name,
    lastName,
    email: row.email,
    phone: row.phone ?? "",
    role: row.role,
    avatar: row.avatar_url ?? "",
    addresses: await customerAddresses(row.id),
    sessionVersion: Number(row.session_version ?? 0),
    hasPassword: Boolean(row.password_hash),
    googleLinked: Boolean(row.google_subject)
  };
}

export async function getCustomerById(id: string) {
  const [rows] = await pool.query<CustomerRow[]>(
    `SELECT id, first_name, last_name, email, phone, password_hash, role, avatar_url, session_version, google_subject
     FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] ? serializeCustomer(rows[0]) : null;
}

export async function findCustomerByEmail(email: string) {
  const [rows] = await pool.query<CustomerRow[]>(
    `SELECT id, first_name, last_name, email, phone, password_hash, role, avatar_url, session_version, google_subject
     FROM users WHERE LOWER(email) = LOWER(?) AND deleted_at IS NULL LIMIT 1`,
    [email.trim()]
  );
  return rows[0] ?? null;
}

export async function registerCustomer(fullName: string, email: string, phone: string, password: string) {
  const existing = await findCustomerByEmail(email);
  if (existing) throw new HttpError(409, "An account already exists for this email address.");
  const { firstName, lastName } = splitName(fullName);
  const id = uuid();
  const passwordHash = await bcrypt.hash(password, 12);
  try {
    await pool.query(
      `INSERT INTO users (id, first_name, last_name, email, phone, password_hash, role)
       VALUES (?, ?, ?, LOWER(?), ?, ?, 'customer')`,
      [id, firstName, lastName || null, email.trim(), phone.trim(), passwordHash]
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "An account already exists for this email address.");
    }
    throw error;
  }
  const customer = await getCustomerById(id);
  if (!customer) throw new HttpError(500, "The customer account could not be created.");
  await associateExistingOrders(id, customer.email);
  return customer;
}

export async function authenticateCustomer(email: string, password: string) {
  const row = await findCustomerByEmail(email);
  if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
    throw new HttpError(401, "The email address or password is incorrect.");
  }
  await pool.query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [row.id]);
  await associateExistingOrders(row.id, row.email);
  return serializeCustomer(row);
}

export async function authenticateGoogleCustomer(identity: VerifiedGoogleIdentity) {
  let userId: string;
  try {
    userId = await withTransaction(async (connection) => {
      const [subjectRows] = await connection.query<CustomerRow[]>(
        `SELECT id, google_subject, avatar_url FROM users
         WHERE google_subject = ? AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
        [identity.subject]
      );
      if (subjectRows[0]) {
        const avatarUrl = shouldRefreshGoogleAvatar(subjectRows[0].avatar_url, identity.picture)
          ? identity.picture
          : subjectRows[0].avatar_url;
        await connection.query(
          `UPDATE users SET last_login_at=CURRENT_TIMESTAMP,
             avatar_url=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          [avatarUrl, subjectRows[0].id]
        );
        return subjectRows[0].id;
      }

      const [emailRows] = await connection.query<CustomerRow[]>(
        `SELECT id, google_subject, avatar_url FROM users
         WHERE LOWER(email)=LOWER(?) AND deleted_at IS NULL LIMIT 1 FOR UPDATE`,
        [identity.email]
      );
      if (emailRows[0]) {
        if (emailRows[0].google_subject && emailRows[0].google_subject !== identity.subject) {
          throw new HttpError(409, "This email is already linked to another Google account.");
        }
        const avatarUrl = shouldRefreshGoogleAvatar(emailRows[0].avatar_url, identity.picture)
          ? identity.picture
          : emailRows[0].avatar_url;
        await connection.query(
          `UPDATE users SET google_subject=?, google_email_verified_at=CURRENT_TIMESTAMP,
             last_login_at=CURRENT_TIMESTAMP,
             avatar_url=?, updated_at=CURRENT_TIMESTAMP
           WHERE id=?`,
          [identity.subject, avatarUrl, emailRows[0].id]
        );
        return emailRows[0].id;
      }

      const id = uuid();
      await connection.query(
        `INSERT INTO users
          (id, first_name, last_name, email, phone, password_hash, role, avatar_url,
           google_subject, google_email_verified_at, last_login_at)
         VALUES (?, ?, ?, ?, NULL, NULL, 'customer', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [id, identity.firstName, identity.lastName || null, identity.email, identity.picture, identity.subject]
      );
      return id;
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ER_DUP_ENTRY") {
      throw new HttpError(409, "This Google account is already associated with a customer. Please try signing in again.");
    }
    throw error;
  }

  const customer = await getCustomerById(userId);
  if (!customer) throw new HttpError(500, "The Google customer account could not be loaded.");
  await associateExistingOrders(customer.id, customer.email);
  return customer;
}

export function signCustomerToken(customer: AuthenticatedCustomer) {
  const options: SignOptions = {
    expiresIn: env.CUSTOMER_JWT_EXPIRES_IN as SignOptions["expiresIn"],
    audience: "customer",
    issuer: "fabpodd"
  };
  return jwt.sign({ sub: customer.id, email: customer.email, version: customer.sessionVersion }, env.JWT_SECRET, options);
}

export function verifyCustomerToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET, { audience: "customer", issuer: "fabpodd" }) as {
    sub: string;
    email: string;
    version: number;
  };
}

export function setCustomerCookie(request: Request, response: Response, token: string) {
  response.cookie(cookieName, token, customerCookieOptions(request));
}

export function clearCustomerCookie(request: Request, response: Response) {
  const options = customerCookieOptions(request);
  delete options.maxAge;
  response.clearCookie(cookieName, options);
}

export async function invalidateCustomerSessions(userId: string) {
  await pool.query(
    "UPDATE users SET session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
    [userId]
  );
}

export async function updateCustomerProfile(userId: string, fullName: string, phone: string) {
  const { firstName, lastName } = splitName(fullName);
  await pool.query(
    "UPDATE users SET first_name = ?, last_name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL",
    [firstName, lastName || null, phone.trim(), userId]
  );
  const customer = await getCustomerById(userId);
  if (!customer) throw new HttpError(404, "Customer account not found.");
  return customer;
}

export async function updateCustomerAvatar(userId: string, avatarUrl: string) {
  await pool.query("UPDATE users SET avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [avatarUrl, userId]);
  const customer = await getCustomerById(userId);
  if (!customer) throw new HttpError(404, "Customer account not found.");
  return customer;
}

export async function changeCustomerPassword(userId: string, currentPassword: string, newPassword: string) {
  const [rows] = await pool.query<CustomerRow[]>(
    "SELECT id, password_hash FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1",
    [userId]
  );
  const row = rows[0];
  if (!row?.password_hash || !(await bcrypt.compare(currentPassword, row.password_hash))) {
    throw new HttpError(400, "Your current password is incorrect.");
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query(
    "UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [passwordHash, userId]
  );
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = resetTokenHash(token);
  await withTransaction(async (connection) => {
    await connection.query("DELETE FROM customer_password_reset_tokens WHERE user_id = ? AND used_at IS NULL", [userId]);
    await connection.query(
      `INSERT INTO customer_password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))`,
      [uuid(), userId, tokenHash]
    );
  });
  return token;
}

export async function resetCustomerPassword(token: string, password: string) {
  const tokenHash = resetTokenHash(token);
  await withTransaction(async (connection) => {
    const [rows] = await connection.query<Array<RowDataPacket & { id: string; user_id: string }>>(
      `SELECT id, user_id FROM customer_password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1 FOR UPDATE`,
      [tokenHash]
    );
    const reset = rows[0];
    if (!reset) throw new HttpError(400, "This password reset link is invalid or has expired.");
    const passwordHash = await bcrypt.hash(password, 12);
    await connection.query(
      "UPDATE users SET password_hash = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [passwordHash, reset.user_id]
    );
    await connection.query("UPDATE customer_password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?", [reset.id]);
  });
}

export const customerAuthCookieName = cookieName;
