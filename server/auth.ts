import { type Express } from "express";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    userId: number;
    isAdmin: boolean;
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(supplied: string, stored: string) {
  // Handle development seeded accounts with plain passwords
  if (!stored.includes('.')) {
    return supplied === stored;
  }

  const [hashedPassword, salt] = stored.split(".");
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedPasswordBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
}

export function setupAuth(app: Express) {
  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      console.log("Login attempt:", { username: req.body.username });
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

      const isValid = await verifyPassword(password, user.password);

      if (!isValid) {
        return res.status(401).json({ 
          message: "Invalid username or password" 
        });
      }

      if (user.is_suspended) {
        return res.status(403).json({
          message: "Account is suspended"
        });
      }

      // Set session data
      req.session.userId = user.id;
      req.session.isAdmin = user.is_admin;

      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to create session" });
        }

        console.log("Login successful:", {
          userId: user.id,
          isAdmin: user.is_admin,
          sessionId: req.session.id
        });

        res.json({
          user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            is_admin: user.is_admin,
            bio: user.bio
          }
        });
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
      console.log("Session data in /api/user:", {
        sessionId: req.session.id,
        userId: req.session.userId,
        isAdmin: req.session.isAdmin
      });

      if (!req.session.userId) {
        return res.status(401).json({ 
          message: "Not authenticated" 
        });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId))
        .limit(1);

      if (!user) {
        return res.status(401).json({ 
          message: "User not found" 
        });
      }

      if (user.is_suspended) {
        return res.status(403).json({
          message: "Account is suspended"
        });
      }

      res.json({
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin,
        bio: user.bio
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
    console.log("Logout request received");
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