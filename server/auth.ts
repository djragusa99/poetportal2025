import { type Express } from "express";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { users } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function verifyPassword(supplied: string, stored: string) {
  // For development seeded accounts with plain text passwords
  if (supplied === stored) {
    return true;
  }

  const [hashedPassword, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return buf.toString("hex") === hashedPassword;
}

declare global {
  namespace Express {
    interface User {
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

export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => {
    console.log("Serializing user:", { id: user.id, username: user.username });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user ID:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log("User not found during deserialization");
        return done(null, false);
      }

      console.log("Successfully deserialized user:", { id: user.id, username: user.username, is_admin: user.is_admin });
      done(null, user);
    } catch (err) {
      console.error("Error during deserialization:", err);
      done(err);
    }
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Login attempt for username:", username);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log("Login failed: User not found");
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          console.log("Login failed: Invalid password");
          return done(null, false, { message: "Invalid username or password" });
        }

        if (user.is_suspended) {
          console.log("Login failed: User is suspended");
          return done(null, false, { message: "Account is suspended" });
        }

        console.log("Login successful for user:", { id: user.id, username: user.username, is_admin: user.is_admin });
        return done(null, user);
      } catch (err) {
        console.error("Login error:", err);
        return done(err);
      }
    })
  );

  app.post("/api/login", (req, res, next) => {
    console.log("Login request received for:", req.body.username);

    passport.authenticate("local", (err: Error | null, user: Express.User | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return next(err);
        }

        console.log("User logged in successfully:", {
          id: user.id,
          username: user.username,
          is_admin: user.is_admin,
          sessionID: req.sessionID
        });

        return res.json({
          user: {
            id: user.id,
            username: user.username,
            display_name: user.display_name,
            is_admin: user.is_admin,
          }
        });
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    console.log("User check request:", {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user?.id
    });

    if (!req.isAuthenticated() || !req.user) {
      console.log("User not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    console.log("Returning user data:", {
      id: user.id,
      username: user.username,
      is_admin: user.is_admin
    });

    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin,
    });
  });

  app.post("/api/logout", (req, res) => {
    if (req.isAuthenticated()) {
      const userId = req.user?.id;
      console.log("Logging out user:", userId);

      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }

        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
          res.clearCookie('sid');
          console.log("User logged out successfully:", userId);
          res.json({ message: "Logged out successfully" });
        });
      });
    } else {
      console.log("Logout request for unauthenticated user");
      res.json({ message: "Already logged out" });
    }
  });
}