import { db as dbPromise } from "./db";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  private async getDb() {
    return await dbPromise;
  }

  // 1. Get All Equipment (Cloud + Local Fallback)
  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE user_id = ${userId} OR userid = ${userId}`);
      if (res && res.rows && res.rows.length > 0) return res.rows;
    } catch (e) {
      console.log("Online fetch failed, trying local...");
    }

    try {
      // @ts-ignore (Local SQLite ke liye purana tarika)
      const client = db.session?.client || db.client;
      if (client.prepare) {
        return client.prepare('SELECT * FROM equipment WHERE userId = ?').all(userId);
      }
      // Agar prepare nahi hai toh execute use karein
      const localRes = await db.execute(sql`SELECT * FROM equipment WHERE userid = ${userId}`);
      return localRes.rows || [];
    } catch (err) {
      return [];
    }
  }

  // 2. Create Equipment (Auto-Sync Fix)
  async createEquipment(ins: any) {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');

    try {
      // @ts-ignore
      const client = db.session?.client || db.client;
      let newId;

      // Check if we are on Local (SQLite)
      if (client.prepare) {
        const info = client.prepare(`INSERT INTO equipment (userId, officeName, division, area, pincode, equipmentName, model, serialNumber, location, modelNumber, manufacturingDate, installedAt, installationDate, monthlyUsage, remarks, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "", ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "", ins.status || "ACTIVE", createdAt);
        newId = info.lastInsertRowid;
      } else {
        // Cloud/Neon ke liye execute
        const res = await db.execute(sql`INSERT INTO equipment (user_id, office_name, status, created_at) VALUES (${ins.userId}, ${ins.officeName || ""}, 'ACTIVE', ${createdAt}) RETURNING id`);
        newId = res.rows[0]?.id;
      }

      // Online Sync (Background) - Ye Agra data cloud par bhejega
      db.execute(sql`INSERT INTO equipment (id, user_id, office_name, status) VALUES (${newId}, ${ins.userId}, ${ins.officeName}, 'ACTIVE')`).catch(() => {});

      return { ...ins, id: newId };
    } catch (err) {
      console.error("Save error:", err);
      throw new Error("Save failed: " + err.message);
    }
  }

  // Baki functions (getEquipment, update, etc.) mein bhi client.prepare ka check laga diya hai
  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
      if (res && res.rows && res.rows[0]) return res.rows[0];
    } catch (e) {}
    try {
      // @ts-ignore
      const client = db.session?.client || db.client;
      if (client.prepare) return client.prepare('SELECT * FROM equipment WHERE id = ?').get(id);
      return null;
    } catch (e) { return null; }
  }

  async swipeTicketToHistory() { return true; }
  async getTrash() { return { equipment: [], tickets: [] }; }
}

export const storage = new DatabaseStorage();