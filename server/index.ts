import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

const app = express();

// First, configure middleware for parsing requests
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Setup session store first
const SessionStore = MemoryStore(session);

// Use a consistent secret key
const SECRET_KEY = process.env.REPL_ID || "development-secret-key";

// Configure session middleware with more robust settings
app.use(
  session({
    secret: SECRET_KEY,
    name: 'sid', // Set a specific cookie name
    resave: false, // Don't save session if unmodified
    saveUninitialized: false, // Don't create session until something stored
    store: new SessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      stale: false, // Delete stale sessions
    }),
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    }
  })
);

// Setup CORS with credentials support before authentication
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    // Allow credentials and specific origin
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Debug middleware to log session data
app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log("Session debug:", {
      path: req.path,
      method: req.method,
      sessionID: req.sessionID,
      session: req.session,
      isAuthenticated: req.isAuthenticated?.()
    });
  }
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

    // Setup authentication after session and before routes
    setupAuth(app);

    // Register routes after auth setup
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