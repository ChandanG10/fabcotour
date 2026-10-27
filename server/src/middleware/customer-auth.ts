import type { RequestHandler } from "express";
import { customerAuthCookieName, getCustomerById, verifyCustomerToken } from "../modules/customer-auth/customer-auth.service.js";
import { HttpError } from "../utils/http.js";

declare module "express-serve-static-core" {
  interface Request {
    customer?: Awaited<ReturnType<typeof getCustomerById>>;
  }
}

async function resolveCustomer(request: Parameters<RequestHandler>[0]) {
  const token = request.cookies?.[customerAuthCookieName];
  if (!token) return null;
  const payload = verifyCustomerToken(token);
  const customer = await getCustomerById(payload.sub);
  if (!customer || customer.sessionVersion !== Number(payload.version)) return null;
  return customer;
}

export const optionalCustomerAuth: RequestHandler = async (request, _response, next) => {
  try {
    request.customer = await resolveCustomer(request);
  } catch {
    request.customer = null;
  }
  next();
};

export const requireCustomerAuth: RequestHandler = async (request, _response, next) => {
  try {
    const customer = await resolveCustomer(request);
    if (!customer) throw new HttpError(401, "Please sign in to continue.");
    request.customer = customer;
    next();
  } catch {
    next(new HttpError(401, "Please sign in to continue."));
  }
};
