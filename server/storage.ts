import { db as dbPromise } from "./db";
import { eq, or, sql } from "drizzle-orm";
import { equipment, repairRequests, type Equipment, type InsertEquipment } from "@shared/schema";

export class DatabaseStorage {
  private async getDb() { return await dbPromise; }

  async getAllEquipment(userId: string): Promise<Equipment[]> {
    const db = await this.getDb();
    try {
      // Direct SQL for safety against schema mismatch
      const res = await db.execute(sql`SELECT * FROM equipment WHERE user_id = ${userId} OR userid = ${userId}`);
      return (res.rows || res) as Equipment[];
    } catch (e) {
      return [];
    }
  }

  async createEquipment(ins: any): Promise<Equipment> {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');
    
    try {
      // Tagged template format use karke 500 error khatam
      const res = await db.execute(sql`
        INSERT INTO equipment (
          user_id, office_name, division, area, pincode, 
          equipment_name, model_number, serial_number, status, created_at,
          office_unique_key, usage, manufacturing_date, install_location, installation_date, remarks
        ) VALUES (
          ${ins.userId}, ${ins.officeName}, ${ins.division}, ${ins.area}, ${ins.pincode},
          ${ins.equipmentName}, ${ins.modelNumber}, ${ins.serialNumber}, ${ins.status || 'ACTIVE'}, ${createdAt},
          ${ins.officeUniqueKey || ''}, ${ins.usage || ''}, ${ins.manufacturingDate || ''}, 
          ${ins.installLocation || ''}, ${ins.installationDate || ''}, ${ins.remarks || ''}
        ) RETURNING *
      `);
      
      const newRecord = (res.rows ? res.rows[0] : res[0]) as Equipment;
      return newRecord;
    } catch (err) {
      console.error("Final Save Error:", err);
      throw new Error("Save Failed: Database Schema Mismatch.");
    }
  }

  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
    return (res.rows ? res.rows[0] : res[0]) || null;
  }
}

export const storage = new DatabaseStorage();