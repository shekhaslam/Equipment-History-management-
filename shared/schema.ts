import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

// 1. Equipment Table
export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userid: text("userid"), // Fallback for storage logic
  officeUniqueKey: text("office_unique_key"), 
  officeName: text("office_name").notNull(),
  division: text("division").notNull(),
  area: text("area").notNull(),
  pincode: text("pincode").notNull(),
  equipmentName: text("equipment_name").notNull(),
  model: text("model"), 
  modelNumber: text("model_number"),
  serialNumber: text("serial_number").notNull(),
  location: text("location"), 
  usage: text("usage"), 
  monthlyUsage: text("monthly_usage"), 
  manufacturingDate: text("manufacturing_date"),
  installedAt: text("installed_at"), 
  installationDate: text("installation_date"),
  remarks: text("remarks"),
  status: text("status").default("ACTIVE").notNull(), 
  letterNumber: text("letter_number"), 
  condemnationDate: text("condemnation_date"),
  createdAt: text("created_at"), 
});

// 2. Repair Requests Table (Public Tickets)
export const repairRequests = pgTable("repair_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  reporterName: text("reporter_name").notNull(),
  reporterMobile: text("reporter_mobile"), // Added for routes compatibility 
  issueDescription: text("issue_description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at"), 
});

// 3. Repairs History Table
export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  date: text("date").notNull(),
  natureOfRepair: text("nature_of_repair").notNull(),
  amount: text("amount").notNull(),
  invoiceNo: text("invoice_no"), // Added for legal/audit
  vendorName: text("vendor_name"), // Added for vendor tracking
  remarks: text("remarks"), // Added for legal/audit
});

// 4. Covering Letters Table (AI Features)
export const coveringLetters = pgTable("covering_letters", {
  id: serial("id").primaryKey(),
  letterNo: text("letter_no").notNull(),
  date: text("date").notNull(),
  recipient: text("recipient").notNull(), 
  sender: text("sender").notNull(),       
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  roughIdea: text("rough_idea"),
  language: text("language").default("English").notNull(),
  attachments: text("attachments"), // JSON string or comma separated file notes
  header: text("header"), // Sticky header (Office Name)
  reference: text("reference"), // Ref No
  designation: text("designation"), // Sender Designation
  createdAt: text("created_at"),
});

// Relations Logic
export const equipmentRelations = relations(equipment, ({ many }) => ({
  repairs: many(repairs),
}));

// --- ZOD SCHEMAS (Exports for routes.ts) ---

// Equipment Schema
export const insertEquipmentSchema = createInsertSchema(equipment).omit({ 
  id: true, 
  createdAt: true,
  userId: true 
});

// ✅ Fix: Repair Request Schema (Jiski vajah se error aa rahi thi)
export const insertRepairSchema = createInsertSchema(repairRequests).omit({
  id: true,
  createdAt: true
});

// Repair History Schema
export const insertRepairsTableSchema = createInsertSchema(repairs).omit({
  id: true
});

// Covering Letter Schema
export const insertCoveringLetterSchema = createInsertSchema(coveringLetters).omit({
  id: true,
  createdAt: true
});

// --- TYPES ---
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type EquipmentWithRepairs = Equipment & { repairs: Repair[] };

export type RepairRequest = typeof repairRequests.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;

export type Repair = typeof repairs.$inferSelect;
export type InsertRepairsTable = z.infer<typeof insertRepairsTableSchema>;

export type CoveringLetter = typeof coveringLetters.$inferSelect;
export type InsertCoveringLetter = z.infer<typeof insertCoveringLetterSchema>;