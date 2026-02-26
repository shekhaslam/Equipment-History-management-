import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Is baar humne ?sslmode=require ko URL ke andar hi rakha hai
    url: "postgres://neondb_owner:npg_R4nZ5OTrGzbe@ep-blue-paper-a5r69o3g.us-east-2.aws.neon.tech/neondb?sslmode=require",
  },
});