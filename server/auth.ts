import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import { users, insertUserSchema, type User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    try {
      const [hashedPassword, salt] = storedPassword.split(".");
      if (!hashedPassword || !salt) {
        console.error("Invalid stored password format");
        return false;
      }
      const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
      const suppliedPasswordBuf = (await scryptAsync(
        suppliedPassword,
        salt,
        64
      )) as Buffer;
      return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
    } catch (error) {
      console.error("Password comparison error:", error);
      return false;
    }
  },
};

export function setupAuth(app: Express) {
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log("Attempting authentication for user:", username);
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log("User not found:", username);
          return done(null, false, { message: "Account not found. Please register first or check your username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log("Password mismatch for user:", username);
          return done(null, false, { message: "Incorrect password. Please try again." });
        }

        console.log("Authentication successful for user:", username);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user: User, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user:", id);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!user) {
        console.log("User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("User deserialized successfully:", user.username);
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration attempt:", req.body);
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") });
      }

      const { username, password, ...userData } = result.data;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const hashedPassword = await crypto.hash(password);

      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          ...userData,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        console.log("Registration successful for user:", newUser.username);
        return res.json(newUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt:", req.body.username);

    passport.authenticate("local", (err: any, user: User | false, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        console.log("Login failed:", info.message);
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return next(err);
        }

        console.log("Login successful for user:", user.username);
        console.log("Session ID:", req.sessionID);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    console.log("Checking user authentication");
    console.log("Session ID:", req.sessionID);
    console.log("Is Authenticated:", req.isAuthenticated());

    if (req.isAuthenticated()) {
      console.log("User authenticated:", (req.user as User).username);
      return res.json(req.user);
    }
    console.log("User not authenticated");
    res.status(401).json({ message: "Not logged in" });
  });

  app.post("/api/logout", (req, res) => {
    const username = (req.user as User)?.username;
    console.log("Logout attempt for user:", username);

    req.logout((err) => {
      if (err) {
        console.error("Logout failed for user:", username, err);
        return res.status(500).json({ message: "Logout failed" });
      }
      console.log("Logout successful for user:", username);
      res.json({ message: "Logout successful" });
    });
  });
}