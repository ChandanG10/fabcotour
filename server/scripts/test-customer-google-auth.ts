import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "../src/db/pool.js";
import {
  authenticateCustomer,
  authenticateGoogleCustomer,
  registerCustomer,
  signCustomerToken,
  updateCustomerAvatar,
  verifyCustomerToken
} from "../src/modules/customer-auth/customer-auth.service.js";
import { verifyGoogleIdToken, type VerifiedGoogleIdentity } from "../src/modules/customer-auth/google-auth.service.js";
import { HttpError } from "../src/utils/http.js";

const runId = randomUUID();
const linkedEmail = `google-link-${runId}@example.com`;
const newEmail = `google-new-${runId}@example.com`;

function identity(subject: string, email: string, picture = "https://lh3.googleusercontent.com/a/test-avatar"): VerifiedGoogleIdentity {
  return {
    subject,
    email,
    name: "Google Test Customer",
    firstName: "Google",
    lastName: "Customer",
    picture
  };
}

async function main() {
  try {
    const passwordCustomer = await registerCustomer("Existing Customer", linkedEmail, "9876543210", "Existing123");
    const linked = await authenticateGoogleCustomer(identity(`google-linked-${runId}`, linkedEmail));
    assert.equal(linked.id, passwordCustomer.id, "A verified matching email must link instead of creating a duplicate.");
    assert.equal((await authenticateCustomer(linkedEmail, "Existing123")).id, passwordCustomer.id, "Password login must remain valid after linking.");

    const repeated = await authenticateGoogleCustomer(identity(`google-linked-${runId}`, linkedEmail));
    assert.equal(repeated.id, linked.id, "The immutable Google subject must resolve the same customer.");

    const created = await authenticateGoogleCustomer(identity(`google-new-${runId}`, newEmail));
    assert.equal(created.email, newEmail);
    assert.equal(created.avatar, "https://lh3.googleusercontent.com/a/test-avatar");

    const refreshed = await authenticateGoogleCustomer(identity(
      `google-new-${runId}`,
      newEmail,
      "https://lh3.googleusercontent.com/a/refreshed-avatar"
    ));
    assert.equal(refreshed.avatar, "https://lh3.googleusercontent.com/a/refreshed-avatar", "Google-hosted avatars must refresh at sign-in.");

    await updateCustomerAvatar(created.id, "https://res.cloudinary.com/example/customer-avatar.jpg");
    const customAvatarPreserved = await authenticateGoogleCustomer(identity(
      `google-new-${runId}`,
      newEmail,
      "https://lh3.googleusercontent.com/a/new-google-avatar"
    ));
    assert.equal(customAvatarPreserved.avatar, "https://res.cloudinary.com/example/customer-avatar.jpg", "A customer-uploaded avatar must not be overwritten by Google sign-in.");

    const session = verifyCustomerToken(signCustomerToken(created));
    assert.equal(session.sub, created.id, "Google customers must receive the normal FabPodd customer session.");

    await assert.rejects(
      () => authenticateGoogleCustomer(identity(`different-google-${runId}`, linkedEmail)),
      (error: unknown) => error instanceof HttpError && error.statusCode === 409
    );
    await assert.rejects(
      () => verifyGoogleIdToken("not-a-google-id-token"),
      (error: unknown) => error instanceof HttpError && error.statusCode === 401
    );

    const [rows] = await pool.query<Array<RowDataPacket & { count: number }>>(
      "SELECT COUNT(*) count FROM users WHERE email IN (?, ?)",
      [linkedEmail, newEmail]
    );
    assert.equal(Number(rows[0]?.count), 2, "Linking must not create a duplicate email account.");
    console.log("Google customer authentication tests passed.");
  } finally {
    await pool.query("DELETE FROM users WHERE email IN (?, ?)", [linkedEmail, newEmail]);
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
