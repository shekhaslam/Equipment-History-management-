import { db as dbPromise } from "./db";
import { equipment, repairs, repairRequests } from "@shared/schema";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  private isCloud = process.env.NODE_ENV === "production"; 

  private async getDb() {
    return await dbPromise;
  }

  // ✅ 1. Get All Equipment (Inventory List fix)
  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    if (this.isCloud) {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE user_id = ${userId} OR userid = ${userId}`);
      return res.rows;
    } else {
      // @ts-ignore
      return db.session.client.prepare('SELECT * FROM equipment WHERE userId = ?').all(userId);
    }
  }

  // ✅ 2. Create Equipment (Save Record fix)
  async createEquipment(ins: any, rep: any[] = []) {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');

    if (this.isCloud) {
      const res = await db.execute(sql`
        INSERT INTO equipment (user_id, office_name, division, area, pincode, equipment_name, model, serial_number, location, model_number, manufacturing_date, installed_at, installation_date, monthly_usage, remarks, status, created_at)
        VALUES (${ins.userId}, ${ins.officeName || ""}, ${ins.division || ""}, ${ins.area || ""}, ${ins.pincode || ""}, ${ins.equipmentName || ""}, ${ins.model || ""}, ${ins.serialNumber || ""}, ${ins.location || ""}, ${ins.modelNumber || ""}, ${ins.manufacturingDate || ""}, ${ins.installedAt || ""}, ${ins.installationDate || ""}, ${ins.monthlyUsage || ""}, ${ins.remarks || ""}, ${ins.status || "ACTIVE"}, ${createdAt})
        RETURNING id
      `);
      const newId = res.rows[0].id;
      return { ...ins, id: newId };
    } else {
      // @ts-ignore
      const info = db.session.client.prepare(`
        INSERT INTO equipment (userId, officeName, division, area, pincode, equipmentName, model, serialNumber, location, modelNumber, manufacturingDate, installedAt, installationDate, monthlyUsage, remarks, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "", ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "", ins.status || "ACTIVE", createdAt);
      return { ...ins, id: info.lastInsertRowid };
    }
  }

  // ✅ 3. Machine Details (Public Report fix)
  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    if (this.isCloud) {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
      return res.rows[0] || null;
    } else {
      // @ts-ignore
      return db.session.client.prepare('SELECT * FROM equipment WHERE id = ?').get(id) || null;
    }
  }

  // ✅ 4. Report Submission (User Ticket fix)
  async createRepairRequest(ins: any): Promise<any> {
    const db = await this.getDb();
    const ticketNo = `DOP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toLocaleDateString('en-GB');

    if (this.isCloud) {
      await db.execute(sql`
        INSERT INTO repair_requests (ticket_no, equipment_id, reporter_name, reporter_mobile, issue_description, priority, status, created_at)
        VALUES (${ticketNo}, ${ins.equipmentId}, ${ins.reporterName}, ${ins.reporterMobile || ""}, ${ins.issueDescription}, ${ins.priority || "medium"}, 'pending', ${createdAt})
      `);
      return { ticketNo };
    } else {
      // @ts-ignore
      const info = db.session.client.prepare(`
        INSERT INTO repair_requests (ticketNo, equipmentId, reporterName, reporterMobile, issueDescription, priority, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ticketNo, ins.equipmentId, ins.reporterName, ins.reporterMobile || "", ins.issueDescription, ins.priority || "medium", "pending", createdAt);
      return { id: info.lastInsertRowid, ticketNo };
    }
  }

  // Status Update Helper
  async updateEquipmentStatus(id: number, status: string) {
    const db = await this.getDb();
    if (this.isCloud) {
      await db.execute(sql`UPDATE equipment SET status = ${status} WHERE id = ${id}`);
    } else {
      // @ts-ignore
      db.session.client.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, id);
    }
    return true;
  }

  // Local-only Dashboard helpers (Bina badlav ke)
  async getEquipment(id: number, userId: string) {
    const db = await this.getDb();
    if (this.isCloud) return null;
    // @ts-ignore
    const res = db.session.client.prepare('SELECT * FROM equipment WHERE id = ? AND userId = ?').get(id, userId);
    if (!res) return null;
    // @ts-ignore
    const itemRepairs = db.session.client.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(id);
    return { ...res, repairs: itemRepairs };
  }

  async getAllTickets() {
    const db = await this.getDb();
    if (this.isCloud) return [];
    // @ts-ignore
    return db.session.client.prepare('SELECT * FROM repair_requests').all();
  }

  async softDeleteEquipment(id: number) {
    const db = await this.getDb();
    // @ts-ignore
    db.session.client.prepare('DELETE FROM equipment WHERE id = ?').run(id);
    return true;
  }

  async getTrash() { return { equipment: [], tickets: [] }; }
}

export const storage = new DatabaseStorage();