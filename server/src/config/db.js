import mysql from 'mysql2/promise';
import { env } from './env.js';

export const db = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});

export async function pingDb() {
  const conn = await db.getConnection();
  try {
    await conn.ping();
  } finally {
    conn.release();
  }
}
