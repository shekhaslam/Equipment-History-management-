import { db as dbPromise } from "./db";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  private async getDb() {
    return await dbPromise;
  }

  // 1. Purana aur Naya Data Load karne ke liye
  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    try {
      // Online check (Neon Cloud)
      const res = await db.execute(sql.query(`SELECT * FROM equipment WHERE user_id = $1 OR userid = $1`, [userId]));
      if (res && res.rows && res.rows.length > 0) return res.rows;
    } catch (e) {
      console.log("Online fetch failed, loading local...");
    }

    try {
      // Local SQLite check (Using raw query for safety)
      const localRes = await db.execute(sql.query(`SELECT * FROM equipment WHERE userid = $1`, [userId]));
      return localRes.rows || [];
    } catch (err) {
      return [];
    }
  }

  // 2. Naya Record Save karne ke liye (Sabse bada fix yahan hai)
  async createEquipment(ins: any) {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');

    try {
      // Universal execution: Local aur Cloud dono ke liye
      await db.execute(sql.query(`
        INSERT INTO equipment (userid, office_name, division, area, pincode, equipment_name, model, serial_number, location, model_number, manufacturing_date, installed_at, installation_date, monthly_usage, remarks, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`, 
        [ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "", ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "", ins.status || "ACTIVE", createdAt]
      ));

      return { ...ins, success: true };
    } catch (err) {
      console.error("Database save error:", err);
      throw new Error("Save failed: SQL format check.");
    }
  }

  // QR Scanning Fix
  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql.query(`SELECT * FROM equipment WHERE id = $1`, [id]));
      return res.rows[0] || null;
    } catch (e) {
      return null;
    }
  }

  async getAllTickets() {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql.query(`SELECT * FROM repair_requests`, []));
      return res.rows || [];
    } catch (e) { return []; }
  }
}

export const storage = new DatabaseStorage();