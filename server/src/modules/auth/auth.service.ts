import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import type { RowDataPacket } from "mysql2";
import type { Response } from "express";
import { env, isProduction } from "../../config/env.js";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../utils/http.js";

export interface AuthenticatedAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "editor";
  mustChangePassword: boolean;
}

interface AdminRow extends RowDataPacket {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: "super_admin" | "editor";
  must_change_password: number;
}

const cookieName = "fab_admin_token";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function ensureDefaultAdmin() {
  const [existing] = await pool.query<RowDataPacket[]>("SELECT id FROM admins WHERE email = ? LIMIT 1", [env.ADMIN_EMAIL]);
  if (existing.length > 0) {
    return;
  }

  const passwordHash = await hashPassword(env.ADMIN_PASSWORD);

  await pool.query(
    `INSERT INTO admins (
      id, email, password_hash, first_name, last_name, role, must_change_password
    ) VALUES (?, ?, ?, ?, ?, 'super_admin', 1)`,
    [uuid(), env.ADMIN_EMAIL, passwordHash, "FAB", "Admin"]
  );
}

export async function findAdminByEmail(email: string) {
  const [rows] = await pool.query<AdminRow[]>(
    `SELECT id, email, password_hash, first_name, last_name, role, must_change_password
     FROM admins
     WHERE email = ? AND deleted_at IS NULL
     LIMIT 1`,
    [email]
  );

  return rows[0] ?? null;
}

export async function authenticateAdmin(email: string, password: string) {
  const admin = await findAdminByEmail(email);
  if (!admin) {
    throw new HttpError(401, "Invalid credentials.");
  }

  const passwordMatches = await bcrypt.compare(password, admin.password_hash);
  if (!passwordMatches) {
    throw new HttpError(401, "Invalid credentials.");
  }

  await pool.query("UPDATE admins SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [admin.id]);

  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.first_name,
    lastName: admin.last_name,
    role: admin.role,
    mustChangePassword: Boolean(admin.must_change_password)
  } satisfies AuthenticatedAdmin;
}

export function signAdminToken(admin: AuthenticatedAdmin) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"]
  };

  return jwt.sign(
    {
      sub: admin.id,
      email: admin.email,
      role: admin.role
    },
    env.JWT_SECRET,
    options
  );
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 24 * 60 * 60 * 1000
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction
  });
}

export function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as {
    sub: string;
    email: string;
    role: "super_admin" | "editor";
  };
}

export async function getAdminById(id: string) {
  const [rows] = await pool.query<AdminRow[]>(
    `SELECT id, email, password_hash, first_name, last_name, role, must_change_password
     FROM admins
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id]
  );

  const admin = rows[0];
  if (!admin) {
    return null;
  }

  return {
    id: admin.id,
    email: admin.email,
    firstName: admin.first_name,
    lastName: admin.last_name,
    role: admin.role,
    mustChangePassword: Boolean(admin.must_change_password)
  } satisfies AuthenticatedAdmin;
}

export async function changeAdminPassword(adminId: string, password: string) {
  const passwordHash = await hashPassword(password);
  await pool.query(
    "UPDATE admins SET password_hash = ?, must_change_password = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [passwordHash, adminId]
  );
}

export const authCookieName = cookieName;
