import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import session from "express-session";
import createMemoryStore from "memorystore";
import passport from "passport";
import { createServer } from "http";

const app = express();

// Basic middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === "http://localhost:5000") {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Session configuration
const MemoryStore = createMemoryStore(session);
app.use(session({
  secret: process.env.REPL_ID || "poet-portal-secret",
  name: "poet.sid",
  resave: false,
  saveUninitialized: false,
  store: new MemoryStore({
    checkPeriod: 86400000, // 24h
  }),
  cookie: {
    secure: false, // Set to true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    path: '/',
  },
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Logging middleware
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
  const server = registerRoutes(app);

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

  const PORT = process.env.PORT || 5000;

  // Function to try binding to a port
  const tryBindPort = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const testServer = createServer();
      testServer.once('error', () => {
        testServer.close();
        resolve(false);
      });
      testServer.once('listening', () => {
        testServer.close();
        resolve(true);
      });
      testServer.listen(port);
    });
  };

  // Try ports until we find an available one
  let port = Number(PORT);
  let isPortAvailable = await tryBindPort(port);
  while (!isPortAvailable && port < Number(PORT) + 10) {
    port++;
    isPortAvailable = await tryBindPort(port);
  }

  if (!isPortAvailable) {
    console.error('Could not find an available port. Please check your running processes.');
    process.exit(1);
  }

  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();