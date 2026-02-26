import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  userid: text("userid"), // Fallback for your storage logic
  officeUniqueKey: text("office_unique_key"), 
  officeName: text("office_name").notNull(),
  division: text("division").notNull(),
  area: text("area").notNull(),
  pincode: text("pincode").notNull(),
  equipmentName: text("equipment_name").notNull(),
  model: text("model"), // Added to match your storage.ts
  modelNumber: text("model_number"),
  serialNumber: text("serial_number").notNull(),
  location: text("location"), // Added to match your storage.ts
  usage: text("usage"), 
  monthlyUsage: text("monthly_usage"), // Added to match your storage.ts
  manufacturingDate: text("manufacturing_date"),
  installedAt: text("installed_at"), // Added to match your storage.ts
  installationDate: text("installation_date"),
  remarks: text("remarks"),
  status: text("status").default("ACTIVE").notNull(), 
  letterNumber: text("letter_number"), 
  condemnationDate: text("condemnation_date"),
  createdAt: text("created_at"), // Changed from timestamp to text
});

export const repairRequests = pgTable("repair_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  reporterName: text("reporter_name").notNull(),
  issueDescription: text("issue_description").notNull(),
  priority: text("priority").notNull().default("medium"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at"), // Changed to text
});

export const repairs = pgTable("repairs", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(),
  date: text("date").notNull(),
  natureOfRepair: text("nature_of_repair").notNull(),
  amount: text("amount").notNull(),
});

export const equipmentRelations = relations(equipment, ({ many }) => ({
  repairs: many(repairs),
}));

export const insertEquipmentSchema = createInsertSchema(equipment).omit({ 
  id: true, 
  createdAt: true,
  userId: true 
});

export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;