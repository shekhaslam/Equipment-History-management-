import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import ws from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// AAPKA PAKKA LINK
const cloudUrl = "postgres://neondb_owner:npg_R4nZ5OTrGzbe@ep-blue-paper-a5r69o3g.us-east-2.aws.neon.tech/neondb?sslmode=require";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sqlitePath = path.resolve(__dirname, '../sqlite.db');

export const db = (async () => {
  const sqlite = new Database(sqlitePath);
  const localDb = drizzleSqlite(sqlite, { schema });
  try {
    const sql = neon(cloudUrl);
    const onlineDb = drizzle(sql, { schema });
    console.log("✅ Cloud Database Connected!");
    return onlineDb;
  } catch (e) {
    console.log("❌ Cloud connection failed, using Local.");
    return localDb;
  }
})();