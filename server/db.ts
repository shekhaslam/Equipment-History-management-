import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// ✅ Wahi purana rasta: data folder ke andar sqlite.db
const dbPath = path.resolve(process.cwd(), "data", "sqlite.db");

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });