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

      // @ts-ignore (storage update k baad ye function work karega)
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
    // Hard delete ki jagah Soft Delete use kar rahe hain (Recycle Bin logic)
    // @ts-ignore
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
      const { equipmentId, reporterName, reporterMobile, issueDescription, priority } = req.body;

      if (!equipmentId || !reporterName || !issueDescription) {
        return res.status(400).json({ message: "Please fill all required fields" });
      }

      const newRequest = await storage.createRepairRequest({
        equipmentId: Number(equipmentId),
        reporterName,
        reporterMobile: reporterMobile || "",
        issueDescription,
        priority: priority || "medium"
      });

      res.status(201).json(newRequest);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to submit report" });
    }
  });

  // ✅ 10. Admin Control: Saare Tickets Fetch Karna
  app.get("/api/admin/tickets", async (_req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (err) {
      res.status(500).json({ message: "Tickets fetch nahi ho paye" });
    }
  });

  // ✅ 11. Manual Swipe: Ticket ko Inventory History mein merge karna
  app.post("/api/admin/tickets/:id/swipe", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { date, nature, amount } = req.body;
      const success = await storage.swipeTicketToHistory(id, { 
        date: date || new Date().toLocaleDateString('en-GB'), 
        nature: nature || "Verified Repair", 
        amount: amount || "0" 
      });
      if (success) res.json({ success: true, message: "Inventory updated" });
      else res.status(404).send("Ticket record not found");
    } catch (err) {
      res.status(500).json({ message: "Swipe process failed" });
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

  return httpServer;
}