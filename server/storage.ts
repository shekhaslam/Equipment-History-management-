import { db as dbPromise } from "./db";
import { equipment, repairs, repairRequests } from "@shared/schema";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  private isCloud = process.env.NODE_ENV === "production"; 

  // ✅ Database instance ko safe tareeke se lene ke liye helper
  private async getDb() {
    return await dbPromise;
  }

  // ✅ 1. Status Update (Render + Local Dono ke liye)
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

  // ✅ 2. Machine Details (Public Report isi se data uthayegi)
  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    if (this.isCloud) {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
      return res.rows[0] || null;
    }
    // @ts-ignore
    return db.session.client.prepare('SELECT * FROM equipment WHERE id = ?').get(id) || null;
  }

  // ✅ 3. User Report Submit (Online Form ke liye)
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

  // --- LOCAL DASHBOARD FUNCTIONS ---
  
  async getEquipment(id: number, userId: string) {
    const db = await this.getDb();
    // @ts-ignore
    const res = db.session.client.prepare('SELECT * FROM equipment WHERE id = ? AND userId = ?').get(id, userId);
    if (!res) return null;
    // @ts-ignore
    const itemRepairs = db.session.client.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(id);
    return { ...res, repairs: itemRepairs };
  }

  async getAllEquipment(userId: string) {
    const db = await this.getDb();
    // @ts-ignore
    const rows = db.session.client.prepare('SELECT * FROM equipment WHERE userId = ?').all(userId);
    // @ts-ignore
    const allRepairs = db.session.client.prepare('SELECT * FROM repairs').all();
    return rows.map((item: any) => ({
      ...item,
      repairs: allRepairs.filter((r: any) => r.equipmentId === item.id)
    }));
  }

  async updateEquipment(id: number, userId: string, ins: any, rep: any[] = []) {
    const db = await this.getDb();
    // @ts-ignore
    db.session.client.prepare(`
      UPDATE equipment 
      SET officeName=?, division=?, area=?, pincode=?, equipmentName=?, model=?, serialNumber=?, location=?, modelNumber=?, manufacturingDate=?, installedAt=?, installationDate=?, monthlyUsage=?, remarks=?, status=?
      WHERE id = ? AND userId = ?
    `).run(ins.officeName, ins.division, ins.area, ins.pincode, ins.equipmentName, ins.model, ins.serialNumber, ins.location, ins.modelNumber, ins.manufacturingDate, ins.installedAt, ins.installationDate, ins.monthlyUsage, ins.remarks, ins.status, id, userId);
    
    await this.saveRepairs(id, rep);
    return this.getEquipment(id, userId);
  }

  async createEquipment(ins: any, rep: any[] = []) {
    const db = await this.getDb();
    // @ts-ignore
    const info = db.session.client.prepare(`
      INSERT INTO equipment (userId, officeName, division, area, pincode, equipmentName, model, serialNumber, location, modelNumber, manufacturingDate, installedAt, installationDate, monthlyUsage, remarks, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "", ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "", ins.status || "ACTIVE", new Date().toLocaleDateString('en-GB'));

    const newId = info.lastInsertRowid;
    if (rep.length > 0) { await this.saveRepairs(Number(newId), rep); }
    return this.getEquipment(Number(newId), ins.userId);
  }

  async getAllTickets() {
    const db = await this.getDb();
    // @ts-ignore
    return db.session.client.prepare('SELECT * FROM repair_requests').all();
  }

  async swipeTicketToHistory(ticketId: number, repairData: { date: string, nature: string, amount: string }) {
    const db = await this.getDb();
    // @ts-ignore
    const ticket = db.session.client.prepare('SELECT * FROM repair_requests WHERE id = ?').get(ticketId);
    if (!ticket) return null;

    // @ts-ignore
    db.session.client.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount) VALUES (?, ?, ?, ?)').run(ticket.equipmentId, repairData.date, repairData.nature, String(repairData.amount));
    // @ts-ignore
    db.session.client.prepare('UPDATE repair_requests SET status = "resolved" WHERE id = ?').run(ticketId);
    return true;
  }

  async softDeleteEquipment(id: number) {
    const db = await this.getDb();
    // @ts-ignore
    db.session.client.prepare('DELETE FROM equipment WHERE id = ?').run(id);
    return true;
  }

  async getTrash() {
    return { equipment: [], tickets: [] };
  }

  private async saveRepairs(eid: number, rep: any[] = []) {
    const db = await this.getDb();
    // @ts-ignore
    db.session.client.prepare('DELETE FROM repairs WHERE equipmentId = ?').run(eid);
    // @ts-ignore
    const insert = db.session.client.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount) VALUES (?, ?, ?, ?)');
    for (const r of rep) {
      insert.run(eid, r.date, r.natureOfRepair, String(r.amount));
    }
  }
}

export const storage = new DatabaseStorage();