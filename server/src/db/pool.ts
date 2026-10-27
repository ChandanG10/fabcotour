import mysql from "mysql2/promise";
import { env, isProduction } from "../config/env.js";
import { withConnectionRetry } from "./connection-retry.js";

declare global {
  var __fabcouturePool__: mysql.Pool | undefined;
}

function createPool() {
  const databasePool = mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // Every Vercel function instance owns a pool. Keeping this small prevents
    // concurrent instances from exhausting the database connection allowance.
    connectionLimit: isProduction ? 1 : 10,
    maxIdle: isProduction ? 0 : 10,
    idleTimeout: isProduction ? 1_000 : 60_000,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10_000,
    namedPlaceholders: true,
    decimalNumbers: true,
    enableKeepAlive: !isProduction,
    keepAliveInitialDelay: 0
  });

  return databasePool;
}

const basePool = globalThis.__fabcouturePool__ ?? createPool();

if (!globalThis.__fabcouturePool__) {
  globalThis.__fabcouturePool__ = basePool;
}

// MySQL rejects excess connection handshakes immediately. A short bounded
// retry lets another serverless request finish and release its connection.
// Only connection-limit errors are retried; query, schema and auth errors are
// returned unchanged.
export const pool = new Proxy(basePool, {
  get(target, property, receiver) {
    if (property === "query") {
      return (...args: Parameters<mysql.Pool["query"]>) =>
        withConnectionRetry(() => target.query(...args));
    }
    if (property === "execute") {
      return (...args: Parameters<mysql.Pool["execute"]>) =>
        withConnectionRetry(() => target.execute(...args));
    }
    if (property === "getConnection") {
      return () => withConnectionRetry(() => target.getConnection());
    }

    const value = Reflect.get(target, property, receiver) as unknown;
    return typeof value === "function" ? value.bind(target) : value;
  }
}) as mysql.Pool;

export async function withTransaction<T>(handler: (connection: mysql.PoolConnection) => Promise<T>) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
