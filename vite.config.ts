import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, "client"),
  
  // ✅ Ye line ensure karegi ki assets hamesha root se load hon, folder se nahi
  base: "/", 

  optimizeDeps: {
    entries: ["./src/main.tsx"],
    include: ["react", "react-dom", "wouter", "@tanstack/react-query"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  // ✅ Isse build aur routing stable ho jati hai
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
});