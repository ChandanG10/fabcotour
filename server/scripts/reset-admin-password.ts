import { pool } from "../src/db/pool.js";
import { env } from "../src/config/env.js";
import { changeAdminPassword, findAdminByEmail } from "../src/modules/auth/auth.service.js";

async function main() {
  const admin = await findAdminByEmail(env.ADMIN_EMAIL);

  if (!admin) {
    throw new Error(`Admin not found for ${env.ADMIN_EMAIL}`);
  }

  await changeAdminPassword(admin.id, env.ADMIN_PASSWORD);
  console.log(`Admin password reset for ${env.ADMIN_EMAIL}.`);
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
