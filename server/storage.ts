import { db as dbPromise } from "./db";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  private async getDb() {
    return await dbPromise;
  }

  // 1. Data Load Fix
  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    try {
      // Cloud check
      const res = await db.execute(sql`SELECT * FROM equipment WHERE user_id = ${userId} OR userid = ${userId}`);
      if (res && res.rows && res.rows.length > 0) return res.rows;
    } catch (e) {
      console.log("Online fetch failed, loading local...");
    }

    try {
      // Local fallback using Tagged Template (Correct Syntax)
      const localRes = await db.execute(sql`SELECT * FROM equipment WHERE userid = ${userId}`);
      return localRes.rows || [];
    } catch (err) {
      return [];
    }
  }

  // 2. Universal Save Fix (No prepare, No SQL format error)
  async createEquipment(ins: any) {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');

    try {
      // Using Tagged Template literal: sql`QUERY ${value}`
      await db.execute(sql`
        INSERT INTO equipment (
          userid, office_name, division, area, pincode, 
          equipment_name, model, serial_number, location, 
          model_number, manufacturing_date, installed_at, 
          installation_date, monthly_usage, remarks, status, created_at
        ) VALUES (
          ${ins.userId}, ${ins.officeName || ""}, ${ins.division || ""}, 
          ${ins.area || ""}, ${ins.pincode || ""}, ${ins.equipmentName || ""}, 
          ${ins.model || ""}, ${ins.serialNumber || ""}, ${ins.location || ""}, 
          ${ins.modelNumber || ""}, ${ins.manufacturingDate || ""}, 
          ${ins.installedAt || ""}, ${ins.installationDate || ""}, 
          ${ins.monthlyUsage || ""}, ${ins.remarks || ""}, 
          ${ins.status || "ACTIVE"}, ${createdAt}
        )
      `);

      return { ...ins, success: true };
    } catch (err) {
      console.error("Save error detail:", err);
      throw new Error("Database error: Please check if tables are created.");
    }
  }

  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
      return res.rows[0] || null;
    } catch (e) { return null; }
  }

  async getAllTickets() {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM repair_requests`);
      return res.rows || [];
    } catch (e) { return []; }
  }
}

export const storage = new DatabaseStorage();