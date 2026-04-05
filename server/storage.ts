import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) { fs.mkdirSync(dataDir, { recursive: true }); }
const sqlite = new Database(path.join(dataDir, "sqlite.db"));

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS equipment (
    id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT NOT NULL,
    officeName TEXT, division TEXT, area TEXT, pincode TEXT,
    equipmentName TEXT, model TEXT, serialNumber TEXT UNIQUE,
    location TEXT, modelNumber TEXT, manufacturingDate TEXT,
    installedAt TEXT, installationDate TEXT, monthlyUsage TEXT,
    remarks TEXT, 
    status TEXT DEFAULT 'ACTIVE',
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, equipmentId INTEGER,
    date TEXT, natureOfRepair TEXT, amount TEXT,
    invoiceNo TEXT, vendorName TEXT, remarks TEXT
  );
  CREATE TABLE IF NOT EXISTS repair_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    equipmentId INTEGER NOT NULL,
    reporterName TEXT NOT NULL,
    reporterMobile TEXT,
    reporterBranch TEXT,
    issueDescription TEXT NOT NULL,
    fault TEXT, 
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    ticketNo TEXT UNIQUE,
    createdAt TEXT
  );
`);

// ✅ MIGRATION: Ensure schema updates apply to existing databases
try {
  sqlite.prepare("SELECT invoiceNo FROM repairs LIMIT 1").get();
} catch (e) {
  console.log("[STORAGE] Migrating legacy repairs table...");
  try { sqlite.exec("ALTER TABLE repairs ADD COLUMN invoiceNo TEXT DEFAULT ''"); } catch(ex) {}
  try { sqlite.exec("ALTER TABLE repairs ADD COLUMN vendorName TEXT DEFAULT ''"); } catch(ex) {}
  try { sqlite.exec("ALTER TABLE repairs ADD COLUMN remarks TEXT DEFAULT ''"); } catch(ex) {}
}

try {
  sqlite.prepare("SELECT ticketNo FROM repair_requests LIMIT 1").get();
} catch (e) {
  console.log("[STORAGE] Migrating repair_requests for ticketNo and reporterMobile...");
  try { sqlite.exec("ALTER TABLE repair_requests ADD COLUMN ticketNo TEXT UNIQUE;"); } catch(ex) {}
  try { sqlite.exec("ALTER TABLE repair_requests ADD COLUMN reporterMobile TEXT;"); } catch(ex) {}
}

try {
  sqlite.prepare("SELECT fault FROM repair_requests LIMIT 1").get();
} catch(e) {
  try { sqlite.exec("ALTER TABLE repair_requests ADD COLUMN fault TEXT;"); } catch(ex) {}
}

// Ensure unique indexing for ticketNo to natively block duplicates
try {
  sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_repair_requests_ticketNo ON repair_requests(ticketNo);");
} catch(e) {}

export const storage = new (class SqliteStorage {
  async getEquipment(id: number, userId: string) {
    const eq = sqlite.prepare('SELECT * FROM equipment WHERE id = ? AND userId = ?').get(id, userId) as any;
    if (!eq) return null;
    
    // Fetch all repairs, sorted by date (if possible, but at least by ID)
    const repairs = sqlite.prepare('SELECT * FROM repairs WHERE equipmentId = ? ORDER BY id DESC').all(id) || [];
    
    // Fetch related tickets (Pending and Resolved)
    const tickets = sqlite.prepare('SELECT * FROM repair_requests WHERE equipmentId = ? ORDER BY id DESC').all(id) || [];
    
    return { ...eq, repairs, tickets };
  }

  async getEquipmentByIdOnly(id: number) {
    return sqlite.prepare('SELECT * FROM equipment WHERE id = ?').get(id) as any;
  }

  async getAllEquipment(userId: string) {
    const rows = sqlite.prepare("SELECT * FROM equipment WHERE userId = ? AND status != 'TRASH' ORDER BY id DESC").all(userId) as any[];
    return rows.map(eq => ({
      ...eq,
      repairs: sqlite.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(eq.id) || []
    }));
  }

  async getAllEquipmentGlobal() {
    const rows = sqlite.prepare("SELECT * FROM equipment WHERE status != 'TRASH' ORDER BY id DESC").all() as any[];
    return rows.map(eq => ({
      ...eq,
      repairs: sqlite.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(eq.id) || []
    }));
  }

  async getTrash() {
    const rows = sqlite.prepare("SELECT * FROM equipment WHERE status = 'TRASH' ORDER BY id DESC").all() as any[];
    return rows.map(eq => ({
      ...eq,
      repairs: sqlite.prepare('SELECT * FROM repairs WHERE equipmentId = ?').all(eq.id) || []
    }));
  }

  // ✅ New helper to update just the status (for Dashboard Toggle)
  async updateEquipmentStatus(id: number, status: string) {
    sqlite.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, id);
    return true;
  }

  async createEquipment(ins: any, rep: any[] = []) {
    const exists = sqlite.prepare('SELECT id FROM equipment WHERE serialNumber = ?').get(ins.serialNumber);
    if (exists) throw new Error(`Serial Number ${ins.serialNumber} already exists!`);

    const stmt = sqlite.prepare(`
      INSERT INTO equipment (
        userId, officeName, division, area, pincode, equipmentName, 
        model, serialNumber, location, modelNumber, manufacturingDate, 
        installedAt, installationDate, monthlyUsage, remarks, status, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const res = stmt.run(
      ins.userId, ins.officeName || "", ins.division || "", ins.area || "", ins.pincode || "",
      ins.equipmentName || "", ins.model || "", ins.serialNumber || "",
      ins.location || "", ins.modelNumber || "", ins.manufacturingDate || "",
      ins.installedAt || "", ins.installationDate || "", ins.monthlyUsage || "",
      ins.remarks || "",
      ins.status || "ACTIVE", // ✅ Saves status from form
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
      ins.status || "ACTIVE", // ✅ Updates status from form
      id, userId
    );
    this.saveRepairs(id, rep);
    return this.getEquipment(id, userId);
  }

  async deleteEquipment(id: number, userId: string) {
    sqlite.prepare('DELETE FROM repairs WHERE equipmentId = ?').run(id);
    sqlite.prepare('DELETE FROM equipment WHERE id = ? AND userId = ?').run(id, userId);
    return true;
  }

  async softDeleteEquipment(id: number, userId: string) {
    sqlite.prepare("UPDATE equipment SET status = 'TRASH' WHERE id = ? AND userId = ?").run(id, userId);
    return true;
  }

  // --- TICKET MANAGEMENT ---

  async createRepairRequest(req: any) {
    let ticketNo = req.ticketNo;
    let mobile = req.reporterMobile ? String(req.reporterMobile).replace('.0', '') : "";
    
    if (ticketNo) {
      // Clean string
      ticketNo = String(ticketNo).trim();
      // NATIVE UPSERT: Avoid custom SELECT checking, rely on SQLite ON CONFLICT
      const stmt = sqlite.prepare(`
        INSERT INTO repair_requests (
          equipmentId, reporterName, reporterMobile, reporterBranch, issueDescription, fault, priority, ticketNo, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(ticketNo) DO UPDATE SET
          reporterName = excluded.reporterName,
          reporterMobile = excluded.reporterMobile,
          reporterBranch = excluded.reporterBranch,
          issueDescription = excluded.issueDescription,
          fault = excluded.fault,
          priority = excluded.priority;
      `);
      stmt.run(
        req.equipmentId, req.reporterName, mobile, req.reporterBranch || "",
        req.issueDescription, req.fault || "", req.priority || "medium", ticketNo, new Date().toLocaleString('en-IN')
      );
      return { id: 0, ticketNo }; // id doesn't matter for updates from cloud
    } else {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let randomString = '';
      for (let i = 0; i < 4; i++) {
          randomString += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      ticketNo = `DOP_ER-${randomString}`;
    }
    
    const stmt = sqlite.prepare(`
      INSERT INTO repair_requests (
        equipmentId, reporterName, reporterMobile, reporterBranch, issueDescription, fault, priority, ticketNo, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(ticketNo) DO UPDATE SET
        reporterName = excluded.reporterName,
        reporterMobile = excluded.reporterMobile,
        reporterBranch = excluded.reporterBranch,
        issueDescription = excluded.issueDescription,
        fault = excluded.fault,
        priority = excluded.priority;
    `);

    const res = stmt.run(
      req.equipmentId, req.reporterName, mobile, req.reporterBranch || "",
      req.issueDescription, req.fault || "", req.priority || "medium",
      ticketNo, new Date().toLocaleString('en-IN')
    );

    return { id: res.lastInsertRowid, ticketNo };
  }

  async updateTicketStatus(ticketId: number, status: string) {
    sqlite.prepare("UPDATE repair_requests SET status = ? WHERE id = ?").run(status, ticketId);
    return true;
  }

  async getAllTickets(userId: string) {
    return sqlite.prepare(`
      SELECT r.*, e.equipmentName, e.serialNumber, e.officeName 
      FROM repair_requests r
      LEFT JOIN equipment e ON r.equipmentId = e.id
      WHERE r.status IN ('pending', 'processing', 'REPORTER_SYNC_PENDING') 
      AND (e.userId = ? OR e.userId IS NULL)
      ORDER BY r.id DESC
    `).all(userId);
  }

  async deleteTicketByNo(ticketNo: string) {
    sqlite.prepare("DELETE FROM repair_requests WHERE ticketNo = ?").run(ticketNo);
    return true;
  }

  async resolveTicket(ticketId: number, resolution: { date: string, nature: string, amount: string, invoiceNo?: string, vendorName?: string, remarks?: string }) {
    const ticket = sqlite.prepare('SELECT * FROM repair_requests WHERE id = ?').get(ticketId) as any;
    if (!ticket) return false;

    // Save resolution details into the ticket record itself (for audit)
    const fullResolution = `RESOLVED | ${resolution.nature} | Inv: ${resolution.invoiceNo} | Cost: ${resolution.amount} | Notes: ${resolution.remarks}`;
    
    // NATIVE RESOLVE: Just mark as archived/resolved in repair_requests
    // This keeps it in the "Service History" for this specific equipment without needing a separate table
    sqlite.prepare("UPDATE repair_requests SET status = 'resolved', issueDescription = ? WHERE id = ?")
      .run(`${ticket.issueDescription} ||| ${fullResolution}`, ticketId);

    return true;
  }

  async swipeTicketToHistory(ticketId: number) {
    const ticket = sqlite.prepare('SELECT * FROM repair_requests WHERE id = ?').get(ticketId) as any;
    if (!ticket || ticket.status !== 'resolved') return false;

    // Parse the resolution details back out
    const parts = ticket.issueDescription.split(' ||| RESOLVED | ');
    if (parts.length < 2) return false;
    
    const resParts = parts[1].split(' | ');
    const nature = resParts[0];
    const invoice = resParts[1]?.replace('Inv: ', '');
    const cost = resParts[2]?.replace('Cost: ', '');
    const remarks = resParts[3]?.replace('Notes: ', '');

    // 1. Move to repairs table (Main Technical History)
    sqlite.prepare(`
      INSERT INTO repairs (equipmentId, date, natureOfRepair, amount, invoiceNo, vendorName, remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ticket.equipmentId, new Date().toLocaleDateString('en-GB'), nature, cost, invoice, "DOP Resolved Ticket", remarks);

    // 2. Mark ticket as 'archived' so it doesn't show up in Service Log's "Swipe" list
    sqlite.prepare("UPDATE repair_requests SET status = 'archived' WHERE id = ?").run(ticketId);

    return true;
  }

  async syncTicketDeletions(validTickets: string[]) {
    // Delete any pending/processing ticket that IS NOT in the cloud sheet anymore
    // (This ensures that if a row is deleted in Google Sheets, it vanishes locally too)
    if (!validTickets || validTickets.length === 0) {
       sqlite.prepare("DELETE FROM repair_requests WHERE ticketNo LIKE 'DOP_ER-%' AND status IN ('pending', 'processing')").run();
       return;
    }
    const placeholders = validTickets.map(() => '?').join(',');
    // ticketNo mapping: ER- is local, DOP_ER- is from cloud
    const statement = `DELETE FROM repair_requests WHERE ticketNo LIKE 'DOP_ER-%' AND status IN ('pending', 'processing') AND ticketNo NOT IN (${placeholders})`;
    sqlite.prepare(statement).run(...validTickets);
  }

  async saveRepairs(eid: number, rep: any[] = [], append: boolean = false) {
    if (!append) {
      sqlite.prepare('DELETE FROM repairs WHERE equipmentId = ?').run(eid);
    }
    const rStmt = sqlite.prepare('INSERT INTO repairs (equipmentId, date, natureOfRepair, amount, invoiceNo, vendorName, remarks) VALUES (?, ?, ?, ?, ?, ?, ?)');
    rep.forEach(r => rStmt.run(eid, r.date, r.natureOfRepair, String(r.amount), r.invoiceNo || "", r.vendorName || "", r.remarks || ""));
    return true;
  }
})();