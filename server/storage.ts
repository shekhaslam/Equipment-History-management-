import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
const sqlite = new Database(path.join(dataDir, "sqlite.db"));

// --- DATABASE TABLES SETUP (Official & Secure) ---
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    userId TEXT NOT NULL,
    officeName TEXT, division TEXT, area TEXT, pincode TEXT,
    equipmentName TEXT, model TEXT, serialNumber TEXT UNIQUE,
    location TEXT, modelNumber TEXT, manufacturingDate TEXT,
    installedAt TEXT, installationDate TEXT, monthlyUsage TEXT,
    remarks TEXT, 
    status TEXT DEFAULT 'ACTIVE',
    isDeleted INTEGER DEFAULT 0,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, 
    equipmentId INTEGER,
    date TEXT, 
    natureOfRepair TEXT, 
    amount TEXT
  );

  CREATE TABLE IF NOT EXISTS repair_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticketNo TEXT UNIQUE,        -- Official Ticket No (Unique)
    equipmentId INTEGER NOT NULL,
    reporterName TEXT NOT NULL,
    reporterMobile TEXT,
    issueDescription TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    isSwiped INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0,
    createdAt TEXT
  );
`);

export const storage = new (class SqliteStorage {
  // --- 1. EQUIPMENT & INVENTORY LOGIC (NO CHANGES) ---
  async getEquipment(id: number, userId: string) {
    const eq = sqlite.prepare('SELECT * FROM equipment WHERE id = ? AND userId = ? AND isDeleted = 0').get(id, userId) as any;
    if (!eq) return null;
    const repairs = sqlite.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(id) || [];
    return { ...eq, repairs };
  }

  async getEquipmentByIdOnly(id: number) {
    const eq = sqlite.prepare('SELECT * FROM equipment WHERE id = ? AND isDeleted = 0').get(id) as any;
    if (!eq) return null;
    return eq;
  }

  async getAllEquipment(userId: string) {
    const rows = sqlite.prepare('SELECT * FROM equipment WHERE userId = ? AND isDeleted = 0 ORDER BY id DESC').all(userId) as any[];
    return rows.map(eq => ({
      ...eq,
      repairs: sqlite.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(eq.id) || []
    }));
  }

  async createEquipment(ins: any, rep: any[] = []) {
    const exists = sqlite.prepare('SELECT id FROM equipment WHERE serialNumber = ?').get(ins.serialNumber);
    if (exists) throw new Error(`Serial Number ${ins.serialNumber} already exists!`);

    const stmt = sqlite.prepare(`
      INSERT INTO equipment (
        userId, officeName, division, area, pincode, equipmentName, 
        model, serialNumber, location, modelNumber, manufacturingDate, 
        installedAt, installationDate, monthlyUsage, remarks, status, isDeleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);

    const res = stmt.run(
      ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "",
      ins.equipmentName || "", ins.model || "", ins.serialNumber || "", 
      ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "",
      ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", 
      ins.remarks || "", 
      ins.status || "ACTIVE",
      new Date().toLocaleDateString('en-GB')
    );

    const id = res.lastInsertRowid as number;
    if (rep.length > 0) { this.saveRepairs(id, rep); }
    return this.getEquipment(id, ins.userId);
  }

  async updateEquipment(id: number, userId: string, ins: any, rep: any[] = []) {
    sqlite.prepare(`
      UPDATE equipment SET 
        officeName=?, division=?, area=?, pincode=?, equipmentName=?, 
        model=?, serialNumber=?, location=?, modelNumber=?, manufacturingDate=?, 
        installedAt=?, installationDate=?, monthlyUsage=?, remarks=?, status=? 
      WHERE id = ? AND userId = ?
    `).run(
      ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "", 
      ins.equipmentName || "", ins.model || "", ins.serialNumber || "", ins.location || "",
      ins.modelNumber || "", ins.manufacturingDate || "",
      ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "", ins.remarks || "",
      ins.status || "ACTIVE",
      id, userId
    );
    this.saveRepairs(id, rep);
    return this.getEquipment(id, userId);
  }

  // --- 2. UNIQUE REPAIR REQUESTS (TICKET SYSTEM) ---
  async createRepairRequest(ins: any): Promise<any> {
    // Unique Ticket No Logic (DOP + Year + 6 Digit Random)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const ticketNo = `DOP-${new Date().getFullYear()}-${randomSuffix}`;

    const stmt = sqlite.prepare(`
      INSERT INTO repair_requests (
        ticketNo, equipmentId, reporterName, reporterMobile, issueDescription, priority, status, isSwiped, isDeleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
    `);

    try {
      const res = stmt.run(
        ticketNo,
        ins.equipmentId,
        ins.reporterName,
        ins.reporterMobile || "",
        ins.issueDescription,
        ins.priority || "medium",
        "pending",
        new Date().toLocaleDateString('en-GB')
      );
      return { id: res.lastInsertRowid, ticketNo };
    } catch (err: any) {
      // Agar TicketNo repeat ho gaya (UNIQUE constraint error), toh auto-retry
      if (err.message.includes("UNIQUE constraint failed")) {
        return this.createRepairRequest(ins);
      }
      throw err;
    }
  }

  async getAllTickets() {
    return sqlite.prepare('SELECT * FROM repair_requests WHERE isDeleted = 0 ORDER BY id DESC').all();
  }

  // --- 3. MANUAL SWIPE (Inventory History Connection) ---
  async swipeTicketToHistory(ticketId: number, repairData: { date: string, nature: string, amount: string }) {
    const ticket = sqlite.prepare('SELECT * FROM repair_requests WHERE id = ?').get(ticketId) as any;
    if (!ticket) return null;

    // Permanent Repairs Table mein add karein
    sqlite.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount) VALUES (?, ?, ?, ?)')
      .run(ticket.equipmentId, repairData.date, repairData.nature, repairData.amount);

    // Ticket ko swipe mark karein
    sqlite.prepare('UPDATE repair_requests SET isSwiped = 1, status = "resolved" WHERE id = ?').run(ticketId);
    return true;
  }

  // --- 4. RECYCLE BIN (SOFT DELETE) LOGIC ---
  async softDeleteEquipment(id: number, userId: string) {
    sqlite.prepare('UPDATE equipment SET isDeleted = 1 WHERE id = ? AND userId = ?').run(id, userId);
    return true;
  }

  async softDeleteTicket(id: number) {
    sqlite.prepare('UPDATE repair_requests SET isDeleted = 1 WHERE id = ?').run(id);
    return true;
  }

  async getTrash() {
    const equipment = sqlite.prepare('SELECT * FROM equipment WHERE isDeleted = 1').all();
    const tickets = sqlite.prepare('SELECT * FROM repair_requests WHERE isDeleted = 1').all();
    return { equipment, tickets };
  }

  async restoreEquipment(id: number) {
    sqlite.prepare('UPDATE equipment SET isDeleted = 0 WHERE id = ?').run(id);
    return true;
  }

  // --- 5. UTILS ---
  private saveRepairs(eid: number, rep: any[] = []) {
    sqlite.prepare('DELETE FROM repairs WHERE equipmentId = ?').run(eid);
    const rStmt = sqlite.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount) VALUES (?, ?, ?, ?)');
    rep.forEach(r => rStmt.run(eid, r.date, r.natureOfRepair, String(r.amount)));
  }

  async updateEquipmentStatus(id: number, status: string) {
    sqlite.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, id);
    return true;
  }
})();