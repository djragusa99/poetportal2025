import { type Express } from "express";
import session from "express-session";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import MemoryStore from "memorystore";

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
  const SessionStore = MemoryStore(session);

  app.use(
    session({
      secret: "your-secret-key",
      resave: false,
      saveUninitialized: false,
      store: new SessionStore({
        checkPeriod: 86400000 // prune expired entries every 24h
      }),
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      }
    })
  );

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, display_name } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          message: "Username and password are required" 
        });
      }

      // Check if user exists
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser.length > 0) {
        return res.status(400).json({ 
          message: "Username already exists" 
        });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const [user] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          display_name: display_name || null
        })
        .returning();

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          is_admin: user.is_admin
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ 
        message: "Failed to register" 
      });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ 
          message: "Username and password are required" 
        });
      }

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ 
          message: "Invalid username or password" 
        });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ 
          message: "Invalid username or password" 
        });
      }

      // Check if user is suspended
      if (user.is_suspended) {
        return res.status(403).json({
          message: "Your account has been suspended"
        });
      }

      // Set session
      (req.session as any).userId = user.id;

      res.json({
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          is_admin: user.is_admin
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        message: "Failed to login" 
      });
    }
  });

  // Get current user endpoint
  app.get("/api/user", async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      if (!userId) {
        return res.status(401).json({ 
          message: "Not authenticated" 
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(401).json({ 
          message: "User not found" 
        });
      }

      res.json({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ 
        message: "Failed to get user info" 
      });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          message: "Failed to logout" 
        });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
}