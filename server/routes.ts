import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, posts } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // User routes - simplified without auth
  app.post("/api/users", async (req, res) => {
    try {
      const { username, displayName, bio } = req.body;
      const [user] = await db
        .insert(users)
        .values({
          username,
          displayName,
          bio: bio || null,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        })
        .returning();
      res.json(user);
    } catch (error) {
      console.error("Failed to create user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(req.params.id)))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.get("/api/users", async (_req, res) => {
    try {
      const allUsers = await db.select().from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}