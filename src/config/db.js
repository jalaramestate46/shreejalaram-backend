import { Pool } from "pg";
import { env } from "./env.js";

const globalPool = globalThis;
const cachedConnection = globalPool.__jalaramPgPool ?? (globalPool.__jalaramPgPool = { pool: null, ready: null });

function createPool() {
  if (!env.supabaseDbUrl) {
    throw new Error("SUPABASE_DB_URL is not set");
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
