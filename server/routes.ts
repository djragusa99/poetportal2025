import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// Middleware to check if user is admin
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Debug log for session data
    console.log("Session data:", { 
      userId: req.session.userId, 
      isAdmin: req.session.isAdmin 
    });

    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId))
      .limit(1);

    if (!user?.is_admin) {
      return res.status(403).json({ message: "Not authorized" });
    }

    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export function registerRoutes(app: Express): Server {
  // Admin routes
  app.get("/api/admin/users", isAdmin, async (_req, res) => {
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

  app.put("/api/admin/users/:id", isAdmin, async (req, res) => {
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
      res.status(500).json({ message: "Failed to update user suspension status" });
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