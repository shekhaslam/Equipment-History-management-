import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { equipment, repairs, repairRequests } from "@shared/schema";

export class DatabaseStorage {
  // --- 1. EQUIPMENT LOGIC (Sare Fields ke saath) ---
  async getEquipment(id: number, userId: string) {
    const [eqItem] = await db.select().from(equipment).where(
      and(eq(equipment.id, id), eq(equipment.userId, userId), eq(equipment.isDeleted, 0))
    );
    if (!eqItem) return null;
    const itemRepairs = await db.select().from(repairs).where(eq(repairs.equipmentId, id));
    return { ...eqItem, repairs: itemRepairs };
  }

  async getEquipmentByIdOnly(id: number) {
    const [eqItem] = await db.select().from(equipment).where(
      and(eq(equipment.id, id), eq(equipment.isDeleted, 0))
    );
    return eqItem || null;
  }

  async getAllEquipment(userId: string) {
    const rows = await db.select().from(equipment).where(
      and(eq(equipment.userId, userId), eq(equipment.isDeleted, 0))
    ).orderBy(desc(equipment.id));
    
    return await Promise.all(rows.map(async (item) => {
      const itemRepairs = await db.select().from(repairs).where(eq(repairs.equipmentId, item.id));
      return { ...item, repairs: itemRepairs };
    }));
  }

  async createEquipment(ins: any, rep: any[] = []) {
    const [newItem] = await db.insert(equipment).values({
      userId: ins.userId,
      officeName: ins.officeName || "",
      division: ins.division || "",
      area: ins.area || "",
      pincode: ins.pincode || "",
      equipmentName: ins.equipmentName || "",
      model: ins.model || "",
      serialNumber: ins.serialNumber || "",
      location: ins.location || "",
      modelNumber: ins.modelNumber || "",
      manufacturingDate: ins.manufacturingDate || "",
      installedAt: ins.installedAt || "",
      installationDate: ins.installationDate || "",
      monthlyUsage: ins.monthlyUsage || "",
      remarks: ins.remarks || "",
      status: ins.status || "ACTIVE",
      isDeleted: 0,
      createdAt: new Date().toLocaleDateString('en-GB')
    }).returning();

    if (rep.length > 0) { await this.saveRepairs(newItem.id, rep); }
    return this.getEquipment(newItem.id, ins.userId);
  }

  async updateEquipment(id: number, userId: string, ins: any, rep: any[] = []) {
    await db.update(equipment).set({
      officeName: ins.officeName,
      division: ins.division,
      area: ins.area,
      pincode: ins.pincode,
      equipmentName: ins.equipmentName,
      model: ins.model,
      serialNumber: ins.serialNumber,
      location: ins.location,
      modelNumber: ins.modelNumber,
      manufacturingDate: ins.manufacturingDate,
      installedAt: ins.installedAt,
      installationDate: ins.installationDate,
      monthlyUsage: ins.monthlyUsage,
      remarks: ins.remarks,
      status: ins.status
    }).where(and(eq(equipment.id, id), eq(equipment.userId, userId)));
    
    await this.saveRepairs(id, rep);
    return this.getEquipment(id, userId);
  }

  // --- 2. TICKET SYSTEM (DOP-2026 Logic) ---
  async createRepairRequest(ins: any): Promise<any> {
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const ticketNo = `DOP-${new Date().getFullYear()}-${randomSuffix}`;
    try {
      const [newTicket] = await db.insert(repairRequests).values({
        ticketNo,
        equipmentId: ins.equipmentId,
        reporterName: ins.reporterName,
        reporterMobile: ins.reporterMobile || "",
        issueDescription: ins.issueDescription,
        priority: ins.priority || "medium",
        status: "pending",
        isSwiped: 0,
        isDeleted: 0,
        createdAt: new Date().toLocaleDateString('en-GB')
      }).returning();
      return { id: newTicket.id, ticketNo };
    } catch (err: any) {
      return this.createRepairRequest(ins); 
    }
  }

  async getAllTickets() {
    return await db.select().from(repairRequests).where(eq(repairRequests.isDeleted, 0)).orderBy(desc(repairRequests.id));
  }

  // --- 3. SWIPE & TRASH ---
  async swipeTicketToHistory(ticketId: number, repairData: { date: string, nature: string, amount: string }) {
    const [ticket] = await db.select().from(repairRequests).where(eq(repairRequests.id, ticketId));
    if (!ticket) return null;
    await db.insert(repairs).values({
      equipmentId: ticket.equipmentId,
      date: repairData.date,
      natureOfRepair: repairData.nature,
      amount: String(repairData.amount)
    });
    await db.update(repairRequests).set({ isSwiped: 1, status: "resolved" }).where(eq(repairRequests.id, ticketId));
    return true;
  }

  async softDeleteEquipment(id: number, userId: string) {
    await db.update(equipment).set({ isDeleted: 1 }).where(and(eq(equipment.id, id), eq(equipment.userId, userId)));
    return true;
  }

  async getTrash() {
    const eqTrash = await db.select().from(equipment).where(eq(equipment.isDeleted, 1));
    const tickTrash = await db.select().from(repairRequests).where(eq(repairRequests.isDeleted, 1));
    return { equipment: eqTrash, tickets: tickTrash };
  }

  private async saveRepairs(eid: number, rep: any[] = []) {
    await db.delete(repairs).where(eq(repairs.equipmentId, eid));
    if (rep.length > 0) {
      await db.insert(repairs).values(rep.map(r => ({
        equipmentId: eid,
        date: r.date,
        natureOfRepair: r.natureOfRepair,
        amount: String(r.amount)
      })));
    }
  }
}
export const storage = new DatabaseStorage();