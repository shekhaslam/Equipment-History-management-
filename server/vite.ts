import { type Express } from "express";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { fileURLToPath } from "url";

const viteLogger = createLogger();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function setupVite(server: Server, app: Express) {
  const root = path.resolve(__dirname, "..");

  const vite = await createViteServer({
    ...viteConfig,
    root: path.resolve(root, "client"), // Yahan humne bata diya ki frontend kahan hai
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server, path: "/vite-hmr" },
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(root, "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      
      // Ye line frontend ki main file ko connect karti hai
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}