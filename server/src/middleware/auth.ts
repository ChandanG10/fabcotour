import type { RequestHandler } from "express";
import { authCookieName, getAdminById, verifyToken } from "../modules/auth/auth.service.js";
import { HttpError } from "../utils/http.js";

declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        role: "super_admin" | "editor";
        mustChangePassword: boolean;
      };
    }
  }
}

export const requireAdminAuth: RequestHandler = async (request, _response, next) => {
  try {
    const token = request.cookies?.[authCookieName];
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
  } catch (error) {
    next(new HttpError(401, "Authentication required."));
  }
};
