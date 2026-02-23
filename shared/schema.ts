import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export * from "./models/auth";

export const equipment = pgTable("equipment", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  officeUniqueKey: text("office_unique_key").notNull(), // 🆕 Office-wise sync के लिए
  officeName: text("office_name").notNull(),
  division: text("division").notNull(),
  area: text("area").notNull(),
  pincode: text("pincode").notNull(),
  equipmentName: text("equipment_name").notNull(),
  modelNumber: text("model_number").notNull(),
  serialNumber: text("serial_number").notNull(),
  usage: text("usage").notNull(), 
  manufacturingDate: text("manufacturing_date"),
  installLocation: text("install_location"),
  installationDate: text("installation_date"),
  remarks: text("remarks"),
  status: text("status").default("ACTIVE").notNull(), 
  letterNumber: text("letter_number"), 
  condemnationDate: text("condemnation_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Repair Requests Table
export const repairRequests = pgTable("repair_requests", {
  id: serial("id").primaryKey(),
  equipmentId: integer("equipment_id").notNull(), // Kis machine ki complaint hai
  reporterName: text("reporter_name").notNull(),   // Kisne report kiya
  issueDescription: text("issue_description").notNull(), // Kya samasya hai
  priority: text("priority").notNull().default("medium"), // High, Medium, Low
  status: text("status").notNull().default("pending"), // pending, in-progress, fixed
  createdAt: timestamp("created_at").defaultNow(),
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

export const repairsRelations = relations(repairs, ({ one }) => ({
  equipment: one(equipment, {
    fields: [repairs.equipmentId],
    references: [equipment.id],
  }),
}));

export const insertEquipmentSchema = createInsertSchema(equipment).omit({ 
  id: true, 
  createdAt: true,
  userId: true 
}).extend({
  status: z.string().optional().default("ACTIVE"),
  officeUniqueKey: z.string(), // Form submission में ज़रूरी है
  letterNumber: z.string().optional(),
  condemnationDate: z.string().optional()
});

export const insertRepairSchema = createInsertSchema(repairs).omit({ id: true });
export type Equipment = typeof equipment.$inferSelect;
export type InsertEquipment = z.infer<typeof insertEquipmentSchema>;
export type Repair = typeof repairs.$inferSelect;
export type InsertRepair = z.infer<typeof insertRepairSchema>;
export type EquipmentWithRepairs = Equipment & { repairs: Repair[] };