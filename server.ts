import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { setupSockets } from "./server/sockets/index.js";
import { registerRoutes } from "./server/routes/index.js";
import cors from "cors";
import helmet from "helmet";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Basic security and parsing
  app.use(express.json());
  app.use(cors());
  
  // Note: Helmet can interfere with Vite during development if CSP is too strict.
  // We'll use a relaxed configuration for dev.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Setup Socket.IO
  setupSockets(server);

  // API Routes FIRST
  registerRoutes(app);

  // Vite integration or static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
