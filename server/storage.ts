import { db as dbPromise } from "./db";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  private async getDb() { return await dbPromise; }

  // 1. Data Loading (Cloud + Local)
  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE user_id = ${userId} OR userid = ${userId}`);
      if (res && res.rows && res.rows.length > 0) return res.rows;
    } catch (e) { console.log("Cloud fetch failed, trying local..."); }

    try {
      const localRes = await db.execute(sql`SELECT * FROM equipment WHERE userid = ${userId}`);
      return localRes.rows || [];
    } catch (err) { return []; }
  }

  // 2. Create Record (Universal Save)
  async createEquipment(ins: any) {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');
    try {
      await db.execute(sql`
        INSERT INTO equipment (userid, office_name, division, area, pincode, equipment_name, model, serial_number, location, model_number, manufacturing_date, installed_at, installation_date, monthly_usage, remarks, status, created_at)
        VALUES (${ins.userId}, ${ins.officeName || ""}, ${ins.division || ""}, ${ins.area || ""}, ${ins.pincode || ""}, ${ins.equipmentName || ""}, ${ins.model || ""}, ${ins.serialNumber || ""}, ${ins.location || ""}, ${ins.modelNumber || ""}, ${ins.manufacturingDate || ""}, ${ins.installedAt || ""}, ${ins.installationDate || ""}, ${ins.monthlyUsage || ""}, ${ins.remarks || ""}, ${ins.status || "ACTIVE"}, ${createdAt})
      `);
      return { ...ins, success: true };
    } catch (err) { 
      console.error("Database error:", err);
      throw new Error("Save Failed: SQL syntax matched to version."); 
    }
  }

  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
    return res.rows[0] || null;
  }

  async getAllTickets() {
    const db = await this.getDb();
    const res = await db.execute(sql`SELECT * FROM repair_requests`);
    return res.rows || [];
  }
  
  async swipeTicketToHistory() { return true; }
  async getTrash() { return { equipment: [], tickets: [] }; }
}

export const storage = new DatabaseStorage();