import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const sql = await readFile(resolve(__dirname, "../migrations/001_init.sql"), "utf8");
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await pool.query(statement);
  }

  console.log(`Applied ${statements.length} SQL statements.`);
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
