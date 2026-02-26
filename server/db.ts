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
  try {
    // Render/Production Mode
    if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL) {
      const sql = neon(databaseUrl);
      return drizzle(sql, { schema });
    }

    // Local Development Mode (Safe Path Fix)
    let sqlitePath;
    try {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      sqlitePath = path.resolve(__dirname, '../sqlite.db');
    } catch (e) {
      sqlitePath = path.join(process.cwd(), 'sqlite.db');
    }
    
    const sqlite = new Database(sqlitePath);
    return drizzleSqlite(sqlite, { schema });
  } catch (e) {
    // Emergency Fallback
    return drizzleSqlite(new Database('sqlite.db'), { schema });
  }
})();