import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// 1. Render Environment Variable ko pehle check karein
const databaseUrl = process.env.DATABASE_URL || "postgres://neondb_owner:npg_R4nZ5OTrGzbe@ep-blue-paper-a5r69o3g.us-east-2.aws.neon.tech/neondb?sslmode=require";

// 2. Path Fix (Render/Linux compatibility)
const getSqlitePath = () => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return path.resolve(__dirname, '../sqlite.db');
  } catch (e) {
    // Fallback for production/environments where import.meta.url behaves differently
    return path.join(process.cwd(), 'sqlite.db');
  }
};

export const db = (async () => {
  const sqlitePath = getSqlitePath();
  
  try {
    // Agar Render par hain, toh seedha Cloud connect karein
    if (process.env.DATABASE_URL || process.env.NODE_ENV === 'production') {
      const sql = neon(databaseUrl);
      const onlineDb = drizzle(sql, { schema });
      console.log("✅ Cloud Database Connected!");
      return onlineDb;
    }
    
    // Local development ke liye SQLite
    const sqlite = new Database(sqlitePath);
    console.log("📂 Using Local SQLite Database");
    return drizzleSqlite(sqlite, { schema });

  } catch (e) {
    console.log("⚠️ Database initialization error, using SQLite fallback.");
    const sqlite = new Database(sqlitePath);
    return drizzleSqlite(sqlite, { schema });
  }
})();