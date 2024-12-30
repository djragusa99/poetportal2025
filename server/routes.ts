import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  // Setup auth first
  const { authenticateToken, isAdmin } = setupAuth(app);

  // Admin routes
  app.get("/api/admin/users", authenticateToken, isAdmin, async (_req, res) => {
    try {
      const allUsers = await db
        .select({
          id: users.id,
          username: users.username,
          display_name: users.display_name,
          bio: users.bio,
          is_admin: users.is_admin,
          is_suspended: users.is_suspended,
          created_at: users.created_at
        })
        .from(users)
        .orderBy(users.created_at);

      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", authenticateToken, isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, display_name, bio } = req.body;

    try {
      const [updatedUser] = await db
        .update(users)
        .set({
          username: username || undefined,
          display_name: display_name || undefined,
          bio: bio || undefined
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}