import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

const databaseUrl = process.env.DATABASE_URL || "postgres://neondb_owner:npg_R4nZ5OTrGzbe@ep-blue-paper-a5r69o3g.us-east-2.aws.neon.tech/neondb?sslmode=require";

export const db = (async () => {
  // 1. Path setup (Local ke liye zaroori hai)
  let sqlitePath;
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    sqlitePath = path.resolve(__dirname, '../sqlite.db');
  } catch (e) {
    sqlitePath = path.join(process.cwd(), 'sqlite.db');
  }

  try {
    // Agar Render (Production) par hain toh Cloud connect karein
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      const sql = neon(databaseUrl);
      console.log("✅ Cloud Database Connected!");
      return drizzle(sql, { schema });
    }
    
    // Local development ke liye SQLite
    const sqlite = new Database(sqlitePath);
    console.log("📂 Local SQLite Connected at:", sqlitePath);
    return drizzleSqlite(sqlite, { schema });
  } catch (e) {
    return drizzleSqlite(new Database('sqlite.db'), { schema });
  }
})();