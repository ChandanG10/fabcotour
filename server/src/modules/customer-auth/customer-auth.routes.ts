import { Router } from "express";
import rateLimit from "express-rate-limit";
import nodemailer from "nodemailer";
import { z } from "zod";
import { env, isProduction } from "../../config/env.js";
import { optionalCustomerAuth, requireCustomerAuth } from "../../middleware/customer-auth.js";
import { asyncHandler, HttpError } from "../../utils/http.js";
import {
  authenticateCustomer,
  authenticateGoogleCustomer,
  changeCustomerPassword,
  clearCustomerCookie,
  createPasswordResetToken,
  findCustomerByEmail,
  invalidateCustomerSessions,
  registerCustomer,
  resetCustomerPassword,
  setCustomerCookie,
  signCustomerToken
} from "./customer-auth.service.js";
import { verifyGoogleIdToken } from "./google-auth.service.js";

const passwordSchema = z.string().min(8, "Use at least 8 characters.").max(128)
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");
const emailSchema = z.string().trim().email().max(255);
const phoneSchema = z.string().trim().min(10).max(32).regex(/^[+()\d\s-]+$/, "Enter a valid mobile number.");
const registrationSchema = z.object({
  name: z.string().trim().min(2).max(160),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
const googleLoginSchema = z.object({ credential: z.string().min(100).max(16_000) });
const forgotSchema = z.object({ email: emailSchema });
const resetSchema = z.object({ token: z.string().min(32).max(256), password: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.password === data.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });
const changeSchema = z.object({ currentPassword: z.string().min(1).max(128), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((data) => data.newPassword === data.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] });

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: "Too many attempts. Please try again in 15 minutes." } });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { message: "Too many password reset requests. Please try again later." } });

async function sendPasswordEmail(email: string, resetUrl: string, purpose: "reset" | "set") {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD || !env.SMTP_FROM) return false;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_PORT === 465, requireTLS: env.SMTP_PORT !== 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000
  });
  try {
    const result = await transport.sendMail({
      from: { name: "FabPodd", address: env.SMTP_FROM }, to: email,
      subject: purpose === "set" ? "Set your FabPodd password" : "Reset your FabPodd password",
      text: `Use this secure link to ${purpose === "set" ? "set" : "reset"} your FabPodd password. It expires in 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`
    });
    return result.accepted.length > 0;
  } finally {
    transport.close();
  }
}

export const customerAuthRouter = Router();
customerAuthRouter.use((_request, response, next) => { response.setHeader("Cache-Control", "no-store"); next(); });

customerAuthRouter.post("/register", authLimiter, asyncHandler(async (request, response) => {
  const payload = registrationSchema.parse(request.body);
  const customer = await registerCustomer(payload.name, payload.email, payload.phone, payload.password);
  setCustomerCookie(request, response, signCustomerToken(customer));
  response.status(201).json({ customer });
}));

customerAuthRouter.post("/login", authLimiter, asyncHandler(async (request, response) => {
  const payload = loginSchema.parse(request.body);
  const customer = await authenticateCustomer(payload.email, payload.password);
  setCustomerCookie(request, response, signCustomerToken(customer));
  response.json({ customer });
}));

customerAuthRouter.post("/google", authLimiter, asyncHandler(async (request, response) => {
  const { credential } = googleLoginSchema.parse(request.body);
  const identity = await verifyGoogleIdToken(credential);
  const customer = await authenticateGoogleCustomer(identity);
  setCustomerCookie(request, response, signCustomerToken(customer));
  response.json({ customer });
}));

customerAuthRouter.post("/logout", optionalCustomerAuth, asyncHandler(async (request, response) => {
  if (request.customer) await invalidateCustomerSessions(request.customer.id);
  clearCustomerCookie(request, response);
  response.status(204).send();
}));

customerAuthRouter.get("/me", requireCustomerAuth, asyncHandler(async (request, response) => {
  response.json({ customer: request.customer });
}));

customerAuthRouter.post("/forgot-password", resetLimiter, asyncHandler(async (request, response) => {
  const { email } = forgotSchema.parse(request.body);
  const customer = await findCustomerByEmail(email);
  let developmentResetUrl: string | undefined;
  if (customer) {
    const token = await createPasswordResetToken(customer.id);
    const frontend = (env.FRONTEND_URL || env.APP_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");
    const resetUrl = `${frontend}/reset-password?token=${encodeURIComponent(token)}`;
    const sent = await sendPasswordEmail(customer.email, resetUrl, "reset").catch(() => false);
    if (!sent && isProduction) throw new HttpError(503, "Password reset email is temporarily unavailable. Please try again later.");
    if (!sent && !isProduction) developmentResetUrl = resetUrl;
  }
  response.json({ message: "If an account exists for that email, a reset link has been sent.", ...(developmentResetUrl ? { developmentResetUrl } : {}) });
}));

customerAuthRouter.post("/set-password-request", requireCustomerAuth, resetLimiter, asyncHandler(async (request, response) => {
  const customer = request.customer;
  if (!customer) throw new HttpError(401, "Authentication required.");
  if (customer.hasPassword) throw new HttpError(409, "This account already has a password. Use Change Password instead.");
  const token = await createPasswordResetToken(customer.id);
  const frontend = (env.FRONTEND_URL || env.APP_ORIGIN || "http://localhost:5173").replace(/\/+$/, "");
  const resetUrl = `${frontend}/reset-password?token=${encodeURIComponent(token)}&purpose=set`;
  const sent = await sendPasswordEmail(customer.email, resetUrl, "set").catch(() => false);
  if (!sent && isProduction) throw new HttpError(503, "The verification email is temporarily unavailable. Please try again later.");
  response.json({
    message: `A secure password setup link was sent to ${customer.email}. It expires in 30 minutes.`,
    ...(!sent && !isProduction ? { developmentResetUrl: resetUrl } : {})
  });
}));

customerAuthRouter.post("/reset-password", resetLimiter, asyncHandler(async (request, response) => {
  const payload = resetSchema.parse(request.body);
  await resetCustomerPassword(payload.token, payload.password);
  clearCustomerCookie(request, response);
  response.json({ message: "Your password has been reset. You can now sign in." });
}));

customerAuthRouter.post("/change-password", requireCustomerAuth, authLimiter, asyncHandler(async (request, response) => {
  const customer = request.customer;
  if (!customer) throw new HttpError(401, "Authentication required.");
  const payload = changeSchema.parse(request.body);
  await changeCustomerPassword(customer.id, payload.currentPassword, payload.newPassword);
  clearCustomerCookie(request, response);
  response.json({ message: "Password changed. Please sign in again." });
}));
