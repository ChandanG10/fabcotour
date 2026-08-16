import type { RequestHandler } from "express";
import {
  authCookieName,
  getAdminById,
  legacyAuthCookieName,
  verifyToken
} from "../modules/auth/auth.service.js";
import { HttpError } from "../utils/http.js";

declare module "express-serve-static-core" {
  interface Request {
    admin?: {
      id: string;
      email: string;
      name: string;
      firstName: string;
      lastName: string;
      role: "super_admin" | "editor";
      mustChangePassword: boolean;
    };
  }
}

export const requireAdminAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = request.cookies?.[authCookieName] ?? request.cookies?.[legacyAuthCookieName];
    if (!token) {
      throw new HttpError(401, "Authentication required.");
    }

    const payload = verifyToken(token);
    const admin = await getAdminById(payload.sub);

    if (!admin) {
      throw new HttpError(401, "Authentication required.");
    }

    request.admin = admin;
    next();
  } catch {
    next(new HttpError(401, "Authentication required."));
  }
};
