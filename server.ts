import "./server/config/env";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiRouter from "./server/routes";
import { seedTeacherAccount } from "./server/routes/auth";
import { errorHandler } from "./server/middleware/errorHandler";

const PORT = 3000;

async function startServer() {
  const app = express();

  // Basic security and parsing middleware
  app.use(express.json());

  // Serve public uploads statically
  app.use("/uploads", express.static(path.join(process.cwd(), "public", "uploads")));

  // Mount API endpoints
  app.use("/api", apiRouter);

  // Auto seed default teacher credentials on boot
  await seedTeacherAccount();

  // Integrated Vite middleware for development vs static build files for production
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

  // Global standardized error response formatter
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started and running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Critical: Failed to launch backend server process:", err);
});
