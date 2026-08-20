import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { RowDataPacket } from "mysql2";
import { pool } from "../src/db/pool.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const migrationsDirectory = resolve(__dirname, "../migrations");
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  const [appliedRows] = await pool.query<Array<RowDataPacket & { name: string }>>("SELECT name FROM schema_migrations");
  const applied = new Set(appliedRows.map((row) => row.name));
  const files = (await readdir(migrationsDirectory))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();
  let appliedCount = 0;

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }

    const sql = await readFile(resolve(migrationsDirectory, file), "utf8");
    const statements = sql
      .split(/;\s*(?:\n|$)/)
      .map((statement) => statement.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }
    await pool.query("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
    appliedCount += 1;
  }

  console.log(`Applied ${appliedCount} migration${appliedCount === 1 ? "" : "s"}.`);
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
