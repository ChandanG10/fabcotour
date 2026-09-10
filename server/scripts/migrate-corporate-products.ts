import { readFile } from "node:fs/promises";
import { pool } from "../src/db/pool.js";
// Applies only this feature's additive migration; never runs unrelated pending migrations.
try {
 const name = "018_corporate_products.sql";
 const sql = await readFile(new URL(`../migrations/${name}`, import.meta.url), "utf8");
 for (const statement of sql.split(/;\s*(?:\n|$)/).map(value => value.trim()).filter(Boolean)) await pool.query(statement);
 await pool.query("INSERT IGNORE INTO schema_migrations (name) VALUES (?)", [name]);
 console.log("Corporate products schema and six starter kits are ready.");
} finally { await pool.end(); }
