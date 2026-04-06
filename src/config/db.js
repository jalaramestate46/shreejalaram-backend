import { Pool } from "pg";
import { env } from "./env.js";

const globalPool = globalThis;
const cachedConnection = globalPool.__jalaramPgPool ?? (globalPool.__jalaramPgPool = { pool: null, ready: null });

function createPool() {
  if (!env.supabaseDbUrl) {
    throw new Error(
      "Database URL is not set. Add SUPABASE_DB_URL, DATABASE_URL, or POSTGRES_URL in your environment."
    );
  }

  if (/^https?:\/\//i.test(env.supabaseDbUrl)) {
    throw new Error(
      "Database URL is invalid. Use the Supabase Postgres connection string, not the Supabase project https URL."
    );
  }

  const needsSsl = env.nodeEnv === "production" || /supabase\.co/i.test(env.supabaseDbUrl);

  return new Pool({
    connectionString: env.supabaseDbUrl,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
}

export async function connectDB() {
  if (cachedConnection.ready) {
    return cachedConnection.pool;
  }

  if (!cachedConnection.pool) {
    cachedConnection.pool = createPool();
  }

  try {
    await cachedConnection.pool.query("select 1");
    cachedConnection.ready = cachedConnection.pool;
    return cachedConnection.pool;
  } catch (error) {
    await cachedConnection.pool?.end().catch(() => {});
    cachedConnection.pool = null;
    cachedConnection.ready = null;
    throw error;
  }
}

export async function query(text, params = []) {
  const pool = await connectDB();
  return pool.query(text, params);
}

export function getPool() {
  if (cachedConnection.pool) {
    return cachedConnection.pool;
  }

  cachedConnection.pool = createPool();
  return cachedConnection.pool;
}
