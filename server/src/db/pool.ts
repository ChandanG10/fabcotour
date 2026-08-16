import mysql from "mysql2/promise";
import { env, isProduction } from "../config/env.js";

declare global {
  var __fabcouturePool__: mysql.Pool | undefined;
}

function createPool() {
  return mysql.createPool({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    // Every Vercel function instance owns a pool. Keeping this small prevents
    // concurrent instances from exhausting the database connection allowance.
    connectionLimit: isProduction ? 2 : 10,
    maxIdle: isProduction ? 2 : 10,
    idleTimeout: 60_000,
    waitForConnections: true,
    queueLimit: 0,
    connectTimeout: 10_000,
    namedPlaceholders: true,
    decimalNumbers: true,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });
}

export const pool = globalThis.__fabcouturePool__ ?? createPool();

if (!globalThis.__fabcouturePool__) {
  globalThis.__fabcouturePool__ = pool;
}

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
