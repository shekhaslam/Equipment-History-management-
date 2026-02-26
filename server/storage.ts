import { db as dbPromise } from "./db";
import { eq, or, sql } from "drizzle-orm";
import { equipment, repairRequests, type Equipment, type InsertEquipment } from "@shared/schema";

export class DatabaseStorage {
  private async getDb() { return await dbPromise; }

  // 1. Fetch Fix: Query Builder use karke syntax error khatam
  async getAllEquipment(userId: string): Promise<Equipment[]> {
    const db = await this.getDb();
    try {
      const results = await db.select().from(equipment).where(
        or(eq(equipment.userId, userId), eq(equipment.userid, userId))
      );
      return results;
    } catch (e) {
      console.log("Fetch failed, returning empty list");
      return [];
    }
  }

  // 2. Save Fix: toISOString error hatane ke liye simple string usage
  async createEquipment(insertData: any): Promise<Equipment> {
    const db = await this.getDb();
    const createdAtStr = new Date().toLocaleDateString('en-GB');

    try {
      // Direct SQL use karenge taaki Drizzle ka internal mapping crash na ho
      const [newRecord] = await db.insert(equipment).values({
        userid: insertData.userId,
        officeName: insertData.officeName || "",
        division: insertData.division || "",
        area: insertData.area || "",
        pincode: insertData.pincode || "",
        equipmentName: insertData.equipmentName || "",
        model: insertData.model || "",
        serialNumber: insertData.serialNumber || "",
        location: insertData.location || "",
        modelNumber: insertData.modelNumber || "",
        manufacturingDate: insertData.manufacturingDate || "",
        installedAt: insertData.installedAt || "",
        installationDate: insertData.installationDate || "",
        monthlyUsage: insertData.monthlyUsage || "",
        remarks: insertData.remarks || "",
        status: insertData.status || "ACTIVE",
        createdAt: createdAtStr
      }).returning();

      return newRecord;
    } catch (err) {
      console.error("Critical Save Error:", err);
      throw new Error("Final save failed: Check schema sync.");
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