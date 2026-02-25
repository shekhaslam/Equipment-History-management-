import * as schema from "@shared/schema";
import path from "path";

export let db: any;

async function initializeDb() {
  if (process.env.DATABASE_URL) {
    // Cloud Mode: Neon PostgreSQL use karega
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(process.env.DATABASE_URL);
    return drizzle(sql, { schema });
  } else {
    // Local Mode: Aapka purana SQLite chalta rahega
    const Database = (await import("better-sqlite3")).default;
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const dbPath = path.resolve(process.cwd(), "data", "sqlite.db");
    const sqlite = new Database(dbPath);
    return drizzle(sqlite, { schema });
  }
}

// Server chalu hote hi database set karein
db = await initializeDb();