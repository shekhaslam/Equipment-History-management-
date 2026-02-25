import { db as dbPromise } from "./db";
import { equipment, repairs, repairRequests } from "@shared/schema";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  // Check karta hai ki hum Render (Cloud) par hain ya Local computer par
  private isCloud = process.env.NODE_ENV === "production"; 

  private async getDb() {
    return await dbPromise;
  }

  // ✅ 1. Get All Equipment (Dono jagah se data fetch karne ki koshish karega)
  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    try {
      // Agar internet hai, toh pehle Cloud se data uthayega
      const res = await db.execute(sql`SELECT * FROM equipment WHERE user_id = ${userId} OR userid = ${userId}`);
      if (res.rows.length > 0) return res.rows;
    } catch (e) {
      console.log("Internet offline, loading local data...");
    }
    // Agar internet nahi hai, toh SQLite se data dikhayega
    // @ts-ignore
    return db.session.client.prepare('SELECT * FROM equipment WHERE userId = ?').all(userId);
  }

  // ✅ 2. Create Equipment (Asli Auto-Pilot Magic yahan hai)
  async createEquipment(ins: any, rep: any[] = []) {
    const db = await this.getDb();
    const createdAt = new Date().toLocaleDateString('en-GB');

    // PEHLE LOCAL (OFFLINE) MEIN SAVE KAREIN - Taaki kaam na ruke
    // @ts-ignore
    const info = db.session.client.prepare(`
      INSERT INTO equipment (userId, officeName, division, area, pincode, equipmentName, model, serialNumber, location, modelNumber, manufacturingDate, installedAt, installationDate, monthlyUsage, remarks, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "", ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "", ins.status || "ACTIVE", createdAt);
    
    const newId = info.lastInsertRowid;

    // AB BACKGROUND MEIN ONLINE BHEJNE KI KOSHISH - User ko intezaar nahi karna padega
    // Ye tabhi chalega agar aapke local computer ki .env mein DATABASE_URL hai
    if (process.env.DATABASE_URL) {
      db.execute(sql`
        INSERT INTO equipment (id, user_id, office_name, division, area, pincode, equipment_name, model, serial_number, location, model_number, manufacturing_date, installed_at, installation_date, monthly_usage, remarks, status, created_at)
        VALUES (${newId}, ${ins.userId}, ${ins.officeName || ""}, ${ins.division || ""}, ${ins.area || ""}, ${ins.pincode || ""}, ${ins.equipmentName || ""}, ${ins.model || ""}, ${ins.serialNumber || ""}, ${ins.location || ""}, ${ins.modelNumber || ""}, ${ins.manufacturingDate || ""}, ${ins.installedAt || ""}, ${ins.installationDate || ""}, ${ins.monthlyUsage || ""}, ${ins.remarks || ""}, ${ins.status || "ACTIVE"}, ${createdAt})
      `).catch(() => console.log("Silent Sync: Internet nahi hai, data local mein save ho gaya hai."));
    }

    return { ...ins, id: newId };
  }

  // ✅ 3. Machine Details (QR Scan hone par online data dikhane ke liye)
  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
      return res.rows[0] || null;
    } catch {
      // @ts-ignore
      return db.session.client.prepare('SELECT * FROM equipment WHERE id = ?').get(id) || null;
    }
  }

  // ✅ 4. Report Submission (Online Ticket Auto-Sync)
  async createRepairRequest(ins: any): Promise<any> {
    const db = await this.getDb();
    const ticketNo = `DOP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toLocaleDateString('en-GB');

    // Local save
    // @ts-ignore
    db.session.client.prepare(`
      INSERT INTO repair_requests (ticketNo, equipmentId, reporterName, reporterMobile, issueDescription, priority, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ticketNo, ins.equipmentId, ins.reporterName, ins.reporterMobile || "", ins.issueDescription, ins.priority || "medium", "pending", createdAt);

    // Online background sync
    if (process.env.DATABASE_URL) {
      db.execute(sql`
        INSERT INTO repair_requests (ticket_no, equipment_id, reporter_name, reporter_mobile, issue_description, priority, status, created_at)
        VALUES (${ticketNo}, ${ins.equipmentId}, ${ins.reporterName}, ${ins.reporterMobile || ""}, ${ins.issueDescription}, ${ins.priority || 'medium'}, 'pending', ${createdAt})
      `).catch(() => {});
    }

    return { ticketNo };
  }

  // Baki dashboard functions
  async updateEquipmentStatus(id: number, status: string) {
    const db = await this.getDb();
    if (process.env.DATABASE_URL) {
      db.execute(sql`UPDATE equipment SET status = ${status} WHERE id = ${id}`).catch(() => {});
    }
    // @ts-ignore
    db.session.client.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, id);
    return true;
  }

  async getAllTickets() {
    const db = await this.getDb();
    try {
      const res = await db.execute(sql`SELECT * FROM repair_requests`);
      if (res.rows.length > 0) return res.rows;
    } catch {}
    // @ts-ignore
    return db.session.client.prepare('SELECT * FROM repair_requests').all();
  }

  async softDeleteEquipment(id: number) {
    const db = await this.getDb();
    if (process.env.DATABASE_URL) {
      db.execute(sql`DELETE FROM equipment WHERE id = ${id}`).catch(() => {});
    }
    // @ts-ignore
    db.session.client.prepare('DELETE FROM equipment WHERE id = ?').run(id);
    return true;
  }

  async getTrash() { return { equipment: [], tickets: [] }; }
}

export const storage = new DatabaseStorage();