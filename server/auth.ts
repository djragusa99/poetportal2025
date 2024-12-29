import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { users, insertUserSchema } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

declare module "express-session" {
  interface Session {
    userId?: number;
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(password: string, hashedPassword: string) {
  const [hash, salt] = hashedPassword.split(".");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return buf.toString("hex") === hash;
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  app.use(
    session({
      name: "sid",
      secret: process.env.REPL_ID || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });

  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") 
        });
      }

      const { username, password } = result.data;

      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, username),
      });

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
        })
        .returning();

      req.session.userId = user.id;
      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register" });
    }
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        username: user.username
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user info" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("sid");
      res.json({ message: "Logged out successfully" });
    });
  });
}