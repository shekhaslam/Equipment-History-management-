import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ✅ 1. Employee Login/Register Logic (As it was)
  app.post("/api/employee/register", async (req, res) => {
    try {
      const { name, officeName, officeId, pincode, employeeId } = req.body;
      
      if (!name || !officeId || !pincode || !employeeId) {
        return res.status(400).json({ message: "All official fields are required" });
      }

      const identity = `${officeId}_${pincode}`;
      
      res.json({ 
        name, 
        officeName, 
        officeId, 
        pincode, 
        employeeId, 
        identity 
      });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // ✅ 2. Get all equipment (As it was)
  app.get(api.equipment.list.path, async (req, res) => {
    const userId = req.headers["x-employee-identity"] as string;
    
    // ✅ SYNC BYPASS: If internal cloud sync is calling, return all equipment for global backup
    if (userId === "CLOUD_SYNC_INTERNAL") {
        const allEquipment = await storage.getAllEquipmentGlobal();
        return res.json(allEquipment);
    }

    if (!userId) return res.status(401).json({ message: "Unauthorized: Missing Office Key" });
    
    console.log(`[API] Fetching equipment for Office Key: ${userId}`);
    const allEquipment = await storage.getAllEquipment(userId);
    res.json(allEquipment);
  });

  // ✅ 3. Get single equipment (As it was)
  app.get(api.equipment.get.path, async (req, res) => {
    const userId = req.headers["x-employee-identity"] as string;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const equipment = await storage.getEquipment(Number(req.params.id), userId);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found in this office' });
    }
    res.json(equipment);
  });

  // ✅ 4. CREATE Equipment (As it was)
  app.post(api.equipment.create.path, async (req, res) => {
    try {
      const userId = req.headers["x-employee-identity"] as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const { repairs, ...equipmentData } = req.body;
      
      const newEquipment = await storage.createEquipment(
        { ...equipmentData, userId: String(userId) }, 
        repairs || []
      );
      
      res.status(201).json(newEquipment);
    } catch (err: any) {
      if (err.message.includes("unique constraint") || err.message.includes("already exists")) {
        return res.status(400).json({ 
          message: "This serial number already exists in your office records. Please check the dashboard." 
        });
      }
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ✅ 5. UPDATE Equipment (As it was)
  app.put(api.equipment.update.path, async (req, res) => {
    try {
        const userId = req.headers["x-employee-identity"] as string;
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { repairs, ...equipmentData } = req.body;
        const id = Number(req.params.id);
        
        const existing = await storage.getEquipment(id, userId);
        if (!existing) {
            return res.status(404).json({ message: 'Equipment not found' });
        }

        const updated = await storage.updateEquipment(id, userId, equipmentData, repairs || []);
        res.json(updated);
    } catch (err: any) {
        res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ✅ 6. Status Toggle (As it was)
  app.patch("/api/equipment/:id/status", async (req, res) => {
    try {
      const userId = req.headers["x-employee-identity"] as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (isNaN(id)) return res.status(400).send("Invalid ID");
      
      const existing = await storage.getEquipment(id, userId);
      if (!existing) return res.status(404).json({ message: "Equipment not found in your office" });

      await storage.updateEquipmentStatus(id, status);
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Internal server error" });
    }
  });

  // ✅ 7. Soft DELETE (Purane Delete ko Recycle Bin se connect kiya)
  app.delete(api.equipment.delete.path, async (req, res) => {
    const userId = req.headers["x-employee-identity"] as string;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const id = Number(req.params.id);
    const existing = await storage.getEquipment(id, userId);
    if (!existing) {
        return res.status(404).json({ message: 'Equipment not found' });
    }
    await storage.softDeleteEquipment(id, userId);
    res.status(204).send();
  });

  // ---------------------------------------------------------
  // 🆕 NAYE FEATURES (POORA DETAILED LOGIC)
  // ---------------------------------------------------------

  // ✅ 8. Public View (QR Scan k liye)
  app.get("/api/public/equipment/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const equipment = await storage.getEquipmentByIdOnly(id);
      if (!equipment) return res.status(404).json({ message: "Equipment record not found" });
      res.json(equipment);
    } catch (err) {
      res.status(500).json({ message: "Error fetching equipment details" });
    }
  });

  // ✅ 9. Public Report Submission (Ticket Generation)
  app.post("/api/public/report", async (req, res) => {
    try {
      const { 
          equipmentId, reporterName, reporterMobile, reporterBranch, 
          issueDescription, fault, issueType, priority, ticketNo 
      } = req.body;
      
      const result = await storage.createRepairRequest({ 
        equipmentId, reporterName, reporterMobile, reporterBranch, 
        issueDescription: issueType ? `${issueType}: ${issueDescription}` : issueDescription, 
        fault, priority, ticketNo 
      });

      // ✅ CLOUD PUSH: Push report to Google Sheets immediately if configured
      const { CLOUD_BRIDGE_URL } = process.env;
      if (CLOUD_BRIDGE_URL && !ticketNo) { // Only push if it didn't COME FROM cloud
          try {
              const fetch = (await import('node-fetch')).default;
              await fetch(CLOUD_BRIDGE_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ 
                      action: "submit_report",
                      equipmentId,
                      reporterName,
                      mobile: reporterMobile,
                      branchName: reporterBranch,
                      faultDomain: fault,
                      issueType: issueType || "GENERAL",
                      issueDescription
                  })
              });
              console.log("☁️ Report Pushed to Cloud Bridge");
          } catch (e) {
              console.error("Cloud Report Push failed:", e.message);
          }
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Report submission failed" });
    }
  });

  // ✅ 10. Admin Control: Saare Tickets Fetch Karna
  app.get("/api/admin/tickets", async (req, res) => {
    try {
      const userId = req.headers["x-employee-identity"] as string;
      if (!userId) return res.status(401).json({ message: "Unauthorized: Missing Office Key" });
      
      const tickets = await storage.getAllTickets(userId);
      res.json(tickets);
    } catch (err) {
      res.status(500).json({ message: "Tickets fetch nahi ho paye" });
    }
  });

  // ✅ 10b. Update Ticket Status (e.g., mark as processing)
  app.patch("/api/admin/tickets/:id/status", async (req, res) => {
    try {
      const { status, ticketNo } = req.body;
      await storage.updateTicketStatus(parseInt(req.params.id), status);
      
      // ✅ TRIGGER CLOUD SYNC FOR STATUS CHANGE (PENDING -> PROCESSING)
      if (ticketNo && ticketNo.startsWith('DOP_ER-')) {
          console.log("☁️ Syncing Status Update to Cloud:", ticketNo, "->", status);
          try {
              const fetch = (await import('node-fetch')).default;
              const { CLOUD_BRIDGE_URL } = process.env;
              if (CLOUD_BRIDGE_URL) {
                  await fetch(CLOUD_BRIDGE_URL, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "update_ticket_status", ticketNo, status: status.toUpperCase() })
                  });
              }
          } catch (e) {
              console.error("Cloud Status Sync failed:", e.message);
          }
      }

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Status update failed" });
    }
  });

  // ✅ 11. Resolve Ticket: Mark as processed with admin notes
  app.post("/api/admin/tickets/:id/resolve", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { date, nature, amount, invoiceNo, vendorName, remarks } = req.body;
      const success = await storage.resolveTicket(id, { 
        date: date || new Date().toLocaleDateString('en-GB'), 
        nature: nature || "Verified Repair", 
        amount: amount || "0",
        invoiceNo: invoiceNo || "",
        vendorName: vendorName || "",
        remarks: remarks || ""
      });
      if (success) res.json({ success: true, message: "Ticket marked as resolved" });
      else res.status(404).send("Ticket record not found");
    } catch (err) {
      res.status(500).json({ message: "Resolution failed" });
    }
  });

  // ✅ 11b. Swipe to History: Move resolved ticket to technical repairs table
  app.post("/api/admin/tickets/:id/swipe", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.swipeTicketToHistory(id);
      if (success) res.json({ success: true, message: "Merged into technical history" });
      else res.status(404).send("Could not swipe ticket");
    } catch (err) {
      res.status(500).json({ message: "Swipe failed" });
    }
  });



  // ✅ 11c. Sync Deletions from Cloud
  app.post("/api/admin/tickets/sync-deletions", async (req, res) => {
    try {
      const { validTickets } = req.body;
      if (!Array.isArray(validTickets)) return res.status(400).json({ error: "Invalid data" });
      await storage.syncTicketDeletions(validTickets);
      res.json({ success: true, message: "Deleted missing tickets" });
    } catch (err) {
      res.status(500).json({ message: "Deletion sync failed" });
    }
  });

  // ✅ 12. Recycle Bin View (Trash)
  app.get("/api/admin/trash", async (_req, res) => {
    try {
      const trash = await storage.getTrash();
      res.json(trash);
    } catch (err) {
      res.status(500).send("Trash load nahi ho paya");
    }
  });

  // ✅ 13. Get Server Info (For QR Code IP detection)
  app.get("/api/server-info", async (_req, res) => {
    try {
      const { networkInterfaces } = await import('os');
      const nets = networkInterfaces();
      let ip = "localhost";
      
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]!) {
          // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
          if (net.family === 'IPv4' && !net.internal) {
            ip = net.address;
            break;
          }
        }
        if (ip !== "localhost") break;
      }
      
      res.json({ ip });
    } catch (err) {
      res.status(500).json({ ip: "localhost" });
    }
  });

  return httpServer;
}