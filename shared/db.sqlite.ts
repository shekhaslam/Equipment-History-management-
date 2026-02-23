import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { equipment, repairs } from "./schema";
import path from "path";

const sqlite = new Database(path.join(process.cwd(), "data", "sqlite.db"));
export const db = drizzle(sqlite, {
  schema: { equipment, repairs }
});

// Sync schema for local development
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    officeName TEXT NOT NULL,
    division TEXT NOT NULL,
    area TEXT NOT NULL,
    pincode TEXT NOT NULL,
    equipmentName TEXT NOT NULL,
    modelNumber TEXT NOT NULL,
    serialNumber TEXT NOT NULL,
    usage TEXT NOT NULL,
    manufacturingDate TEXT,
    installLocation TEXT,
    installationDate TEXT,
    remarks TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipmentId INTEGER NOT NULL,
    date TEXT NOT NULL,
    natureOfRepair TEXT NOT NULL,
    amount TEXT NOT NULL,
    FOREIGN KEY (equipmentId) REFERENCES equipment(id)
  );
`);
