import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, posts } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const { username, displayName, bio } = req.body;
      const [user] = await db
        .insert(users)
        .values({ username, displayName, bio })
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

  // Post routes
  app.post("/api/posts", async (req, res) => {
    try {
      const { userId, content } = req.body;
      const [post] = await db
        .insert(posts)
        .values({ userId, content })
        .returning();
      res.json(post);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get("/api/posts", async (_req, res) => {
    try {
      const allPosts = await db.query.posts.findMany({
        with: {
          user: true,
        },
        orderBy: (posts, { desc }) => [desc(posts.createdAt)],
      });
      res.json(allPosts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}