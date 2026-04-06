import mysql from "mysql2/promise";
import { env } from "./env.js";

const globalPool = globalThis;
const cachedConnection = globalPool.__jalaramMysqlPool ?? (globalPool.__jalaramMysqlPool = { pool: null, ready: null });

function createPool() {
  if (!env.mysqlUrl) {
    throw new Error(
      "Database URL is not set. Add MYSQL_URL or DATABASE_URL in your environment."
    );
  }

  if (/^https?:\/\//i.test(env.mysqlUrl)) {
    throw new Error(
      "Database URL is invalid. Use a MySQL connection string such as mysql://user:password@host:3306/database."
    );
  }

  return mysql.createPool({
    uri: env.mysqlUrl,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: "Z",
    namedPlaceholders: false,
    decimalNumbers: true,
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
  const [rows, meta] = await pool.query(text, params);
  return {
    rows: Array.isArray(rows) ? rows : [],
    rowCount: typeof meta?.affectedRows === "number" ? meta.affectedRows : Array.isArray(rows) ? rows.length : 0,
    insertId: meta?.insertId ?? null,
  };
}

export function getPool() {
  if (cachedConnection.pool) {
    return cachedConnection.pool;
  }

  cachedConnection.pool = createPool();
  return cachedConnection.pool;
}
