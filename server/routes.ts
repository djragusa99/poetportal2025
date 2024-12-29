import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// Middleware to check if user is admin
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const userId = (req.session as any).userId;
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.is_admin) {
    return res.status(403).json({ message: "Not authorized" });
  }

  next();
};

export function registerRoutes(app: Express): Server {
  // sets up /api/register, /api/login, /api/logout, /api/user
  setupAuth(app);

  // Admin routes
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const allUsers = await db
        .select()
        .from(users)
        .orderBy(users.createdAt);

      res.json(allUsers.map(user => ({
        ...user,
        password: undefined // Remove password from response
      })));
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { username, display_name } = req.body;

    try {
      const [updatedUser] = await db
        .update(users)
        .set({ 
          username: username || undefined,
          display_name: display_name || undefined
        })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        ...updatedUser,
        password: undefined
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.post("/api/admin/users/:id/suspend", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { suspended } = req.body;

    try {
      const [updatedUser] = await db
        .update(users)
        .set({ is_suspended: suspended })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User suspension status updated" });
    } catch (error) {
      console.error("Error updating user suspension:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
      const [deletedUser] = await db
        .delete(users)
        .where(eq(users.id, userId))
        .returning();

      if (!deletedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}