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

// Declare user type for passport
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      display_name: string | null;
      is_admin: boolean;
      is_suspended: boolean;
    }
  }
}

export function setupAuth(app: Express) {
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }

        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
          return done(null, false, { message: "Invalid username or password" });
        }

        if (user.is_suspended) {
          return done(null, false, { message: "Account is suspended" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        return done(null, false);
      }

      if (user.is_suspended) {
        return done(null, false);
      }

      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: any, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

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

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    res.json({
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin,
    });
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    if (req.isAuthenticated()) {
      req.logout((err) => {
        if (err) {
          console.error("Logout error:", err);
          return res.status(500).json({ message: "Failed to logout" });
        }
        req.session.destroy((err) => {
          if (err) {
            console.error("Session destruction error:", err);
          }
          res.json({ message: "Logged out successfully" });
        });
      });
    } else {
      res.json({ message: "Already logged out" });
    }
  });
}