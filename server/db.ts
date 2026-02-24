import * as schema from "@shared/schema";
import path from "path";

export let db: any;

// ✅ Check karein ki hum Cloud (Render) par hain ya Local
if (process.env.DATABASE_URL) {
  // Cloud Mode: Neon PostgreSQL use karein
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const { neon } = await import("@neondatabase/serverless");
  
  const sql = neon(process.env.DATABASE_URL);
  db = drizzle(sql, { schema });
  console.log("✅ Connected to Cloud PostgreSQL");
} else {
  // Local Mode: SQLite load karein
  const Database = (await import("better-sqlite3")).default;
  const { drizzle } = await import("drizzle-orm/better-sqlite3");
  
  const dbPath = path.resolve(process.cwd(), "data", "sqlite.db");
  const sqlite = new Database(dbPath);
  db = drizzle(sqlite, { schema });
  console.log("🏠 Connected to Local SQLite");
}