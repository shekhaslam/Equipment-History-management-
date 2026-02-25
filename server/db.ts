import * as schema from "@shared/schema";
import path from "path";

// 1. Database variable declare karein
export let db: any;

// 2. Database ko connect karne ka function
async function initializeDb() {
  if (process.env.DATABASE_URL) {
    // Cloud Mode: Neon PostgreSQL
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    return drizzle(sql, { schema });
  } else {
    // Local Mode: SQLite
    const Database = (await import("better-sqlite3")).default;
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const dbPath = path.resolve(process.cwd(), "data", "sqlite.db");
    const sqlite = new Database(dbPath);
    return drizzle(sqlite, { schema });
  }
}

// 3. Server start hote hi ise initialize karein
db = await initializeDb();