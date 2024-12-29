import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

const app = express();

// Setup session store first
const SessionStore = MemoryStore(session);

// Configure session middleware
app.use(
  session({
    secret: process.env.REPL_ID || "your-secret-key",
    resave: true, // Changed to true to ensure session is saved
    saveUninitialized: true, // Changed to true to create session for all requests
    store: new SessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      secure: false, // Set to false to work in development
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/' // Ensure cookie is sent for all paths
    }
  })
);

// Then setup other middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup CORS with credentials support
app.use((req, res, next) => {
  // Allow credentials
  res.header("Access-Control-Allow-Credentials", "true");

  // Set origin based on request
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  }

  // Allow methods
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Debug middleware to log session data
app.use((req, _res, next) => {
  console.log("Session data:", {
    id: req.session.id,
    userId: req.session.userId,
    isAdmin: req.session.isAdmin,
    cookie: req.session.cookie
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // First verify database connection
    try {
      await db.execute(sql`SELECT 1`);
      log("✓ Database connection verified");
    } catch (error) {
      log("⨯ Database connection failed");
      throw error;
    }

    // Setup authentication before routes
    setupAuth(app);

    // Register routes after auth setup
    const server = registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`✓ Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();