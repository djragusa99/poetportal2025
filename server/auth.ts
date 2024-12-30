import { type Express, Request, Response, NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.REPL_ID || "your-jwt-secret-key";

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        display_name: string | null;
        bio: string | null;
        is_admin: boolean;
        is_suspended: boolean;
        created_at: Date;
      }
    }
  }
}

// Crypto helper functions
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

// JWT helper functions
const generateToken = (user: any) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      is_admin: user.is_admin 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Middleware to verify JWT token
const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Fetch fresh user data from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.id))
      .limit(1);

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if user is suspended
    if (user.is_suspended) {
      return res.status(403).json({ message: "Account is suspended" });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ message: "Invalid token" });
    }
    next(err);
  }
};

// Admin middleware
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({ message: "Not authorized" });
  }
  next();
};

export function setupAuth(app: Express) {
  // Register endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, display_name } = req.body;

      // Check if user exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await crypto.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          display_name: display_name || null,
        })
        .returning();

      // Generate JWT token
      const token = generateToken(newUser);

      res.json({
        token,
        user: {
          id: newUser.id,
          username: newUser.username,
          display_name: newUser.display_name,
          is_admin: newUser.is_admin,
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error during registration" });
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Check if user is suspended before verifying password
      if (user.is_suspended) {
        return res.status(403).json({ message: "Login Failed. Your account has been suspended." });
      }

      // Verify password
      const isValid = await crypto.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid username or password" });
      }

      // Generate JWT token
      const token = generateToken(user);

      res.json({
        token,
        user: {
          id: user.id,
          username: user.username,
          display_name: user.display_name,
          is_admin: user.is_admin,
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Error during login" });
    }
  });

  // Get current user endpoint
  app.get("/api/user", authenticateToken, (req: Request, res: Response) => {
    const user = req.user;
    res.json({
      id: user!.id,
      username: user!.username,
      display_name: user!.display_name,
      is_admin: user!.is_admin,
    });
  });

  // Return middlewares for use in other routes
  return {
    authenticateToken,
    isAdmin
  };
}