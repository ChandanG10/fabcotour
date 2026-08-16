import { ensureDefaultAdmin } from "../src/modules/auth/auth.service.js";
import { pool } from "../src/db/pool.js";
async function main() {
    await ensureDefaultAdmin();
    console.log("Default admin seed completed.");
    await pool.end();
}
void main().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
});
