import { db } from "./db";
import { equipment, repairs, repairRequests } from "@shared/schema";
import { sql } from "drizzle-orm";

export class DatabaseStorage {
  // @ts-ignore
  private client = db.session.client; 
  private isCloud = process.env.NODE_ENV === "production"; 

  // ✅ 1. Status Update (Render + Local Dono ke liye)
  async updateEquipmentStatus(id: number, status: string) {
    if (this.isCloud) {
      await db.execute(sql`UPDATE equipment SET status = ${status} WHERE id = ${id}`);
    } else {
      this.client.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, id);
    }
    return true;
  }

  // ✅ 2. Machine Details (Public Report isi se data uthayegi)
  async getEquipmentByIdOnly(id: number) {
    if (this.isCloud) {
      const res = await db.execute(sql`SELECT * FROM equipment WHERE id = ${id}`);
      return res.rows[0] || null;
    }
    return this.client.prepare('SELECT * FROM equipment WHERE id = ?').get(id) || null;
  }

  // ✅ 3. User Report Submit (Online Form ke liye)
  async createRepairRequest(ins: any): Promise<any> {
    const ticketNo = `DOP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const createdAt = new Date().toLocaleDateString('en-GB');

    if (this.isCloud) {
      await db.execute(sql`
        INSERT INTO repair_requests (ticket_no, equipment_id, reporter_name, reporter_mobile, issue_description, priority, status, created_at)
        VALUES (${ticketNo}, ${ins.equipmentId}, ${ins.reporterName}, ${ins.reporterMobile || ""}, ${ins.issueDescription}, ${ins.priority || "medium"}, 'pending', ${createdAt})
      `);
      return { ticketNo };
    } else {
      const info = this.client.prepare(`
        INSERT INTO repair_requests (ticketNo, equipmentId, reporterName, reporterMobile, issueDescription, priority, status, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(ticketNo, ins.equipmentId, ins.reporterName, ins.reporterMobile || "", ins.issueDescription, ins.priority || "medium", "pending", createdAt);
      return { id: info.lastInsertRowid, ticketNo };
    }
  }

  // --- AAPKE PURANE FUNCTIONS (JO LOCAL DASHBOARD CHALATE HAIN - NO CHANGE) ---
  
  async getEquipment(id: number, userId: string) {
    const res = this.client.prepare('SELECT * FROM equipment WHERE id = ? AND userId = ?').get(id, userId);
    if (!res) return null;
    const itemRepairs = this.client.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(id);
    return { ...res, repairs: itemRepairs };
  }

  async getAllEquipment(userId: string) {
    const rows = this.client.prepare('SELECT * FROM equipment WHERE userId = ?').all(userId);
    const allRepairs = this.client.prepare('SELECT * FROM repairs').all();
    return rows.map((item: any) => ({
      ...item,
      repairs: allRepairs.filter((r: any) => r.equipmentId === item.id)
    }));
  }

  async updateEquipment(id: number, userId: string, ins: any, rep: any[] = []) {
    this.client.prepare(`
      UPDATE equipment 
      SET officeName=?, division=?, area=?, pincode=?, equipmentName=?, model=?, serialNumber=?, location=?, modelNumber=?, manufacturingDate=?, installedAt=?, installationDate=?, monthlyUsage=?, remarks=?, status=?
      WHERE id = ? AND userId = ?
    `).run(ins.officeName, ins.division, ins.area, ins.pincode, ins.equipmentName, ins.model, ins.serialNumber, ins.location, ins.modelNumber, ins.manufacturingDate, ins.installedAt, ins.installationDate, ins.monthlyUsage, ins.remarks, ins.status, id, userId);
    
    await this.saveRepairs(id, rep);
    return this.getEquipment(id, userId);
  }

  async createEquipment(ins: any, rep: any[] = []) {
    const info = this.client.prepare(`
      INSERT INTO equipment (userId, officeName, division, area, pincode, equipmentName, model, serialNumber, location, modelNumber, manufacturingDate, installedAt, installationDate, monthlyUsage, remarks, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "", ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "", ins.status || "ACTIVE", new Date().toLocaleDateString('en-GB'));

    const newId = info.lastInsertRowid;
    if (rep.length > 0) { await this.saveRepairs(Number(newId), rep); }
    return this.getEquipment(Number(newId), ins.userId);
  }

  async getAllTickets() {
    return this.client.prepare('SELECT * FROM repair_requests').all();
  }

  async swipeTicketToHistory(ticketId: number, repairData: { date: string, nature: string, amount: string }) {
    const ticket = this.client.prepare('SELECT * FROM repair_requests WHERE id = ?').get(ticketId);
    if (!ticket) return null;

    this.client.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount) VALUES (?, ?, ?, ?)').run(ticket.equipmentId, repairData.date, repairData.nature, String(repairData.amount));
    this.client.prepare('UPDATE repair_requests SET status = "resolved" WHERE id = ?').run(ticketId);
    return true;
  }

  async softDeleteEquipment(id: number) {
    this.client.prepare('DELETE FROM equipment WHERE id = ?').run(id);
    return true;
  }

  async getTrash() {
    return { equipment: [], tickets: [] };
  }

  private async saveRepairs(eid: number, rep: any[] = []) {
    this.client.prepare('DELETE FROM repairs WHERE equipmentId = ?').run(eid);
    const insert = this.client.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount) VALUES (?, ?, ?, ?)');
    for (const r of rep) {
      insert.run(eid, r.date, r.natureOfRepair, String(r.amount));
    }
  }
}

export const storage = new DatabaseStorage();