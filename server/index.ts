import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//Added logging middleware before session
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Log authentication state for all requests
  if (path.startsWith('/api')) {
    log(`Request ${req.method} ${path}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Auth state: ${req.isAuthenticated()} User ID: ${req.user?.id}`);
  }

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

// Setup session store with proper configuration
const SessionStore = MemoryStore(session);
const SECRET_KEY = process.env.REPL_ID || "development-secret-key";

// Enable trust proxy for secure cookies behind proxy
app.set('trust proxy', 1);

app.use(
  session({
    name: 'sid',
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      ttl: 24 * 60 * 60 * 1000 // TTL of 24 hours
    }),
    cookie: {
      httpOnly: true,
      secure: false, // Set to false since we're not using HTTPS in development
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  })
);

// Setup auth AFTER session middleware
setupAuth(app);

// Debug middleware to log requests and session state
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Log authentication state for all requests
  if (path.startsWith('/api')) {
    log(`Request ${req.method} ${path}`);
    log(`Session ID: ${req.sessionID}`);
    log(`Auth state: ${req.isAuthenticated()} User ID: ${req.user?.id}`);
  }

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
    // Verify database connection
    await db.execute(sql`SELECT 1`);
    log("✓ Database connection verified");

    const server = registerRoutes(app);

    // Error handling middleware
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