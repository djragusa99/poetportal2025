import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { seed } from "../db/seed";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  try {
    // Verify database connection
    try {
      await db.execute(sql`SELECT 1`);
      log("✓ Database connection verified");
    } catch (error) {
      console.error("Failed to connect to database:", error);
      process.exit(1);
    }

    if (app.get("env") === "development") {
      // Only seed if the tables are empty
      try {
        const result = await db.execute<{ exists: boolean }>(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'users'
          );
        `);

        const exists = result.rows?.[0]?.exists ?? false;

        if (!exists) {
          log("🌱 Starting database seeding...");
          await seed();
          log("✅ Database seeded successfully");
        } else {
          log("ℹ️ Database tables already exist, skipping seed");
        }
      } catch (error) {
        console.error("Failed to check database state or seed:", error);
        // Continue with application startup even if seeding fails
      }
    }

    const server = registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Error:", err);
      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`serving on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();