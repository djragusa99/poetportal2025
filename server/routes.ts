import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, events, pointsOfInterest, resources } from "@db/schema";
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

  // Points of Interest routes - Removed authenticateToken to allow public access
  app.get("/api/points-of-interest", async (_req, res) => {
    try {
      console.log("Fetching points of interest...");
      const points = await db
        .select({
          id: pointsOfInterest.id,
          title: pointsOfInterest.title,
          description: pointsOfInterest.description,
          location: pointsOfInterest.location,
          link: pointsOfInterest.link,
        })
        .from(pointsOfInterest)
        .orderBy(pointsOfInterest.title);

      console.log(`Found ${points.length} points of interest`);
      res.json(points);
    } catch (error) {
      console.error("Error fetching points of interest:", error);
      res.status(500).json({ message: "Failed to fetch points of interest" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (_req, res) => {
    try {
      console.log("Fetching resources...");
      const allResources = await db
        .select({
          id: resources.id,
          title: resources.title,
          description: resources.description,
          type: resources.type,
          link: resources.link,
        })
        .from(resources)
        .orderBy(resources.title);

      console.log(`Found ${allResources.length} resources`);
      res.json(allResources);
    } catch (error) {
      console.error("Error fetching resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Events routes
  app.get("/api/events", async (_req, res) => {
    try {
      const allEvents = await db
        .select({
          id: events.id,
          title: events.title,
          description: events.description,
          location: events.location,
          date: events.date,
          created_at: events.created_at,
          created_by: events.created_by
        })
        .from(events)
        .orderBy(events.date);

      res.json(allEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}