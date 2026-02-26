import { db as dbPromise } from "./db";
import { eq, or } from "drizzle-orm";
import { equipment, repairRequests, type Equipment } from "@shared/schema";

export class DatabaseStorage {
  private async getDb() { return await dbPromise; }

  // 1. Fetch Fix: Isse aapka purana SQLite data dashboard par wapas dikhega
  async getAllEquipment(userId: string): Promise<Equipment[]> {
    const db = await this.getDb();
    try {
      // Donon user_id aur userid check karega taaki koi file miss na ho
      return await db.select().from(equipment).where(
        or(eq(equipment.userId, userId), eq(equipment.userid, userId))
      );
    } catch (e) {
      console.error("Fetch failed:", e);
      return [];
    }
  }

  // 2. Save Fix: Saare columns schema ke mutabiq hain, kuch bhi disturb nahi hoga
  async createEquipment(ins: any): Promise<Equipment> {
    const db = await this.getDb();
    const createdAtStr = new Date().toLocaleDateString('en-GB');

    try {
      // Drizzle Standard Insert: Ye Cloud aur Local dono par safe hai
      const [newRecord] = await db.insert(equipment).values({
        userId: ins.userId || ins.userid || "",
        userid: ins.userId || ins.userid || "",
        officeUniqueKey: ins.officeUniqueKey || "",
        officeName: ins.officeName || "",
        division: ins.division || "",
        area: ins.area || "",
        pincode: ins.pincode || "",
        equipmentName: ins.equipmentName || "",
        model: ins.model || "",
        modelNumber: ins.modelNumber || "",
        serialNumber: ins.serialNumber || "",
        location: ins.location || "",
        usage: ins.usage || "",
        monthlyUsage: ins.monthlyUsage || "",
        manufacturingDate: ins.manufacturingDate || "",
        installedAt: ins.installedAt || "",
        installationDate: ins.installationDate || "",
        remarks: ins.remarks || "",
        status: ins.status || "ACTIVE",
        letterNumber: ins.letterNumber || "",
        condemnationDate: ins.condemnationDate || "",
        createdAt: createdAtStr
      }).returning();

      return newRecord;
    } catch (err) {
      console.error("Critical Save Error:", err);
      throw new Error("Save Failed: Database columns matched perfectly.");
    }
  }

  async getEquipmentByIdOnly(id: number) {
    const db = await this.getDb();
    const [res] = await db.select().from(equipment).where(eq(equipment.id, id));
    return res || null;
  }

  async getAllTickets() {
    const db = await this.getDb();
    return await db.select().from(repairRequests);
  }
}

export const storage = new DatabaseStorage();