import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, insertUserSchema, type User } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { z } from "zod";

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

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "poet-portal-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      httpOnly: true,
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie = {
      ...sessionSettings.cookie,
      secure: true,
    };
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

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
          return done(null, false, { message: "Incorrect username." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          console.log("Password mismatch for user:", username);
          return done(null, false, { message: "Incorrect password." });
        }
        console.log("Authentication successful for user:", username);
        return done(null, user);
      } catch (err) {
        console.error("Authentication error:", err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
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
      done(null, user);
    } catch (err) {
      console.error("Deserialization error:", err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      return res
        .status(400)
        .json({ message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") });
    }

    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }

      if (!user) {
        return res.status(400).json({ message: info.message ?? "Login failed" });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

        console.log("Login successful for user:", user.username);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }

      res.json({ message: "Logout successful" });
    });
  });

  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    res.status(401).json({ message: "Not logged in" });
  });
  app.post("/api/register", async (req, res, next) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res
          .status(400)
          .json({ message: "Invalid input: " + result.error.issues.map(i => i.message).join(", ") });
      }

      const { username, password, firstName, lastName, email, location, userType } = result.data;

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
          firstName,
          lastName,
          email,
          location,
          userType,
        })
        .returning();

      req.login(newUser, (err) => {
        if (err) {
          return next(err);
        }
        return res.json(newUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      next(error);
    }
  });
}