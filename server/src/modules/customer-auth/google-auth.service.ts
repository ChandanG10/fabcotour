import { OAuth2Client } from "google-auth-library";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http.js";

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const allowedIssuers = new Set(["accounts.google.com", "https://accounts.google.com"]);

export interface VerifiedGoogleIdentity {
  subject: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  picture: string | null;
}

function safePictureUrl(value: string | undefined) {
  if (!value || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedGoogleIdentity> {
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const audience = Array.isArray(payload?.aud) ? payload.aud : [payload?.aud];
    if (
      !payload?.sub || !payload.email || payload.email_verified !== true ||
      !payload.iss || !allowedIssuers.has(payload.iss) ||
      !audience.includes(env.GOOGLE_CLIENT_ID) ||
      !payload.exp || payload.exp * 1_000 <= Date.now()
    ) {
      throw new Error("Google token claims are invalid.");
    }
    const fallbackName = payload.email.split("@")[0] || "Customer";
    const name = (payload.name || fallbackName).trim().slice(0, 160);
    const firstName = (payload.given_name || name.split(/\s+/)[0] || "Customer").trim().slice(0, 120);
    const lastName = (payload.family_name || name.split(/\s+/).slice(1).join(" ")).trim().slice(0, 120);
    return {
      subject: payload.sub,
      email: payload.email.trim().toLowerCase(),
      name,
      firstName,
      lastName,
      picture: safePictureUrl(payload.picture)
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Google sign-in could not be verified. Please try again.");
  }
}
