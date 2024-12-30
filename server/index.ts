import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";

declare module "express-session" {
  interface SessionData {
    passport: {
      user: number;
    };
  }
}

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Enable trust proxy for secure cookies behind proxy
app.set('trust proxy', 1);

// Setup session store with proper configuration
const SessionStore = MemoryStore(session);
const SECRET_KEY = process.env.REPL_ID || "development-secret-key";

// Enhanced session configuration with strict security
app.use(
  session({
    name: 'sid',
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({
      checkPeriod: 86400000, // prune expired entries every 24h
      ttl: 30 * 24 * 60 * 60 * 1000 // TTL of 30 days
    }),
    cookie: {
      httpOnly: true,
      secure: false, // Set to false since we're not using HTTPS in development
      sameSite: 'lax', // Changed back to 'lax' to allow cross-site authentication
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/'
    }
  })
);

// Setup auth AFTER session middleware
setupAuth(app);

// Detailed logging middleware for debugging session state
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  // Enhanced logging for authentication state
  if (path.startsWith('/api')) {
    console.log('Request details:', {
      method: req.method,
      path: path,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user?.id,
      cookies: req.headers.cookie,
    });

    // Log session data for debugging
    console.log('Session state:', {
      id: req.sessionID,
      cookie: req.session?.cookie,
      passport: req.session?.passport,
    });
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