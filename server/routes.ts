import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

// Enhanced admin middleware with better error handling and logging
const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("Admin middleware - Session state:", {
      isAuthenticated: req.isAuthenticated(),
      sessionID: req.sessionID,
      user: req.user
    });

    if (!req.isAuthenticated()) {
      console.log("Admin check failed - Not authenticated");
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = req.user;
    if (!user?.is_admin) {
      console.log("Admin check failed - Not admin:", {
        userId: user?.id,
        isAdmin: user?.is_admin
      });
      return res.status(403).json({ message: "Not authorized" });
    }

    // Double-check admin status in database
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!dbUser || !dbUser.is_admin) {
      console.log("Admin check failed - User not found or not admin in DB:", {
        userId: user.id,
        foundInDb: !!dbUser,
        isAdminInDb: dbUser?.is_admin
      });
      return res.status(403).json({ message: "Not authorized" });
    }

    console.log("Admin check passed:", {
      userId: user.id,
      username: user.username
    });
    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
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

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}