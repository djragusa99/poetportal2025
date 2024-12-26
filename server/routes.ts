import { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { posts, events, pointsOfInterest, resources, organizations } from "@db/schema";

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    const allPosts = await db.query.posts.findMany({
      with: {
        user: true,
        comments: {
          with: {
            user: true,
          },
        },
      },
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });
    res.json(allPosts);
  });

  app.post("/api/posts", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const { content } = req.body;
    const post = await db
      .insert(posts)
      .values({
        userId: req.user.id,
        content,
      })
      .returning();

    res.json(post[0]);
  });

  // Events routes
  app.get("/api/events", async (req, res) => {
    const allEvents = await db.query.events.findMany({
      with: {
        organization: true,
      },
      orderBy: (events, { desc }) => [desc(events.date)],
    });
    res.json(allEvents);
  });

  // Points of Interest routes
  app.get("/api/points-of-interest", async (req, res) => {
    const pois = await db.query.pointsOfInterest.findMany();
    res.json(pois);
  });

  // Resources routes
  app.get("/api/resources", async (req, res) => {
    const allResources = await db.query.resources.findMany();
    res.json(allResources);
  });

  // Organizations routes
  app.post("/api/organizations/verify", async (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }

    const { name, website, email } = req.body;
    
    if (!email.includes("@") || !website.includes(".")) {
      return res.status(400).send("Invalid email or website");
    }

    const [org] = await db
      .insert(organizations)
      .values({
        userId: req.user.id,
        name,
        website,
        email,
        verified: false,
      })
      .returning();

    res.json(org);
  });

  const httpServer = createServer(app);
  return httpServer;
}
