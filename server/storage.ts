import { db as dbPromise } from "./db";
import { eq, or, sql } from "drizzle-orm";
import { equipment, repairRequests, type Equipment, type InsertEquipment } from "@shared/schema";

export class DatabaseStorage {
  private async getDb() { return await dbPromise; }

  // 1. Fetch Data Fix (Isse aapka SQLite data wapas aa jayega)
  async getAllEquipment(userId: string): Promise<Equipment[]> {
    const db = await this.getDb();
    try {
      return await db.select().from(equipment).where(
        or(eq(equipment.userId, userId), eq(equipment.userid, userId))
      );
    } catch (e) {
      console.error("Fetch Error:", e);
      return [];
    }
  }

  // 2. Create Equipment Fix (Zero Error Save)
  async createEquipment(insertData: InsertEquipment): Promise<Equipment> {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');
    
    try {
      // Drizzle standard insert (Works on both SQLite and Postgres)
      const [newRecord] = await db.insert(equipment).values({
        ...insertData,
        createdAt: createdAt,
        status: insertData.status || "ACTIVE"
      }).returning();
      
      return newRecord;
    } catch (err) {
      console.error("Final Save Error:", err);
      throw new Error("Save Failed: Database Schema Mismatch.");
    }
  }

  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    const [res] = await db.select().from(equipment).where(eq(equipment.id, id));
    return res || null;
  }

  async getAllTickets() {
    const db = await this.getDb();
    return await db.select().from(repairRequests);
  }
}

export const storage = new DatabaseStorage();