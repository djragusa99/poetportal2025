import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { posts, events, pointsOfInterest, resources, organizations, comments } from "@db/schema";

// Middleware to ensure user is authenticated
const requireAuth = (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send("Unauthorized");
  }
  next();
};

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Posts routes
  app.get("/api/posts", async (_req, res) => {
    const allPosts = await db.query.posts.findMany({
      with: {
        user: true,
        comments: {
          with: {
            user: true,
          },
          orderBy: (comments, { desc }) => [desc(comments.createdAt)],
        },
      },
      orderBy: (posts, { desc }) => [desc(posts.createdAt)],
    });
    res.json(allPosts);
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    const { content } = req.body;
    if (!content) {
      return res.status(400).send("Content is required");
    }

    try {
      const [post] = await db
        .insert(posts)
        .values({
          userId: req.user!.id,
          content,
        })
        .returning();

      const postWithUser = await db.query.posts.findFirst({
        where: eq(posts.id, post.id),
        with: {
          user: true,
          comments: {
            with: {
              user: true,
            },
          },
        },
      });

      res.json(postWithUser);
    } catch (error) {
      console.error("Failed to create post:", error);
      res.status(500).send("Failed to create post");
    }
  });

  // Comments routes
  app.post("/api/posts/:postId/comments", requireAuth, async (req, res) => {
    const { content } = req.body;
    const postId = parseInt(req.params.postId);

    if (!content) {
      return res.status(400).send("Content is required");
    }

    try {
      // Verify post exists
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });

      if (!post) {
        return res.status(404).send("Post not found");
      }

      const [comment] = await db
        .insert(comments)
        .values({
          postId,
          userId: req.user!.id,
          content,
        })
        .returning();

      const commentWithUser = await db.query.comments.findFirst({
        where: eq(comments.id, comment.id),
        with: {
          user: true,
        },
      });

      res.json(commentWithUser);
    } catch (error) {
      console.error("Failed to create comment:", error);
      res.status(500).send("Failed to create comment");
    }
  });

  // Events routes
  app.get("/api/events", async (_req, res) => {
    const allEvents = await db.query.events.findMany({
      with: {
        organization: true,
      },
      orderBy: (events, { desc }) => [desc(events.date)],
    });
    res.json(allEvents);
  });

  // Points of Interest routes
  app.get("/api/points-of-interest", async (_req, res) => {
    const pois = await db.query.pointsOfInterest.findMany();
    res.json(pois);
  });

  // Resources routes
  app.get("/api/resources", async (_req, res) => {
    const allResources = await db.query.resources.findMany();
    res.json(allResources);
  });

  // Organizations routes
  app.post("/api/organizations/verify", requireAuth, async (req, res) => {
    const { name, website, email } = req.body;

    if (!name || !website || !email) {
      return res.status(400).send("All fields are required");
    }

    if (!email.includes("@") || !email.includes(".")) {
      return res.status(400).send("Invalid email format");
    }

    let websiteUrl = website;
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      websiteUrl = `https://${website}`;
    }

    try {
      new URL(websiteUrl);
    } catch {
      return res.status(400).send("Invalid website URL");
    }

    try {
      const [org] = await db
        .insert(organizations)
        .values({
          userId: req.user!.id,
          name,
          website: websiteUrl,
          email,
          verified: false,
        })
        .returning();

      res.json(org);
    } catch (error) {
      console.error("Failed to create organization:", error);
      res.status(500).send("Failed to create organization");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}