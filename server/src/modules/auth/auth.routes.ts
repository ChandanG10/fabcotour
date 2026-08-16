import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import {
  authenticateAdmin,
  changeAdminPassword,
  clearAuthCookie,
  setAuthCookie,
  signAdminToken
} from "./auth.service.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Please try again later." }
});

export const authRouter = Router();

authRouter.use((_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  next();
});

authRouter.post(
  "/login",
  loginLimiter,
  asyncHandler(async (request, response) => {
    const payload = loginSchema.parse(request.body);
    const admin = await authenticateAdmin(payload.email, payload.password);
    const token = signAdminToken(admin);

    setAuthCookie(response, token);
    response.status(200).json({ success: true, admin });
  })
);

authRouter.post(
  "/logout",
  asyncHandler(async (_request, response) => {
    clearAuthCookie(response);
    response.status(204).send();
  })
);

authRouter.get(
  "/me",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    response.status(200).json({ success: true, admin: request.admin });
  })
);

authRouter.post(
  "/change-password",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const admin = request.admin;
    if (!admin) {
      throw new HttpError(401, "Authentication required.");
    }

    const payload = changePasswordSchema.parse(request.body);
    await authenticateAdmin(admin.email, payload.currentPassword);
    await changeAdminPassword(admin.id, payload.newPassword);
    response.json({ message: "Password changed successfully." });
  })
);
