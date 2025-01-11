import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable trust proxy for secure cookies behind proxy
app.set('trust proxy', 1);

// CORS middleware for development
if (app.get("env") === "development") {
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
}

// Minimal logging middleware for user information only
app.use((req, res, next) => {
  if (req.path === '/api/user') {
    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      const { username, display_name, location, bio } = bodyJson;
      console.log('\nUser Information:');
      console.log(`Name: ${display_name || username}`);
      console.log(`Location: ${location || 'Not specified'}`);
      console.log(`Bio: ${bio || 'No bio available'}`);
      console.log(''); // Empty line for readability
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
  }
  next();
});

(async () => {
  try {
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    log("✓ Database connection verified");

    const server = registerRoutes(app);

    // Enhanced error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // Start server
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();