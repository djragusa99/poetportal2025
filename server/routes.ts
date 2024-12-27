import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { posts, events, pointsOfInterest, resources, organizations, comments, users } from "@db/schema";

// Middleware to ensure user is authenticated
const requireAuth = async (req: Express.Request, res: Express.Response, next: Express.NextFunction) => {
  // Development bypass - automatically authenticate as Amanda Gorman
  if (process.env.NODE_ENV !== 'production') {
    if (!req.user) {
      // Get Amanda Gorman's user record
      const [testUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, "amandasgorman"))
        .limit(1);

      if (!testUser) {
        console.error("Development user not found");
        return res.status(401).json({ message: "Unauthorized" });
      }

      req.user = testUser;
    }
    console.log("Development bypass: User authenticated as", req.user.username);
    return next();
  }

  // Production authentication check
  if (!req.isAuthenticated()) {
    console.log("Authentication failed: User not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }
  console.log("Authentication successful");
  next();
};

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Posts routes
  app.get("/api/posts", async (_req, res) => {
    try {
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
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", requireAuth, async (req, res) => {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
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
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Comments routes
  app.post("/api/posts/:postId/comments", requireAuth, async (req, res) => {
    const { content, parentId } = req.body;
    const postId = parseInt(req.params.postId);

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    try {
      // Verify post exists
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // If parentId is provided, verify parent comment exists
      if (parentId) {
        const parentComment = await db.query.comments.findFirst({
          where: eq(comments.id, parentId),
        });

        if (!parentComment) {
          return res.status(404).json({ message: "Parent comment not found" });
        }

        if (parentComment.postId !== postId) {
          return res.status(400).json({ message: "Parent comment does not belong to this post" });
        }
      }

      console.log("Creating comment for user:", req.user!.id, "on post:", postId);
      const [comment] = await db
        .insert(comments)
        .values({
          postId,
          userId: req.user!.id,
          parentId: parentId || null,
          content,
        })
        .returning();

      const commentWithUser = await db.query.comments.findFirst({
        where: eq(comments.id, comment.id),
        with: {
          user: true,
          replies: {
            with: {
              user: true,
            },
          },
        },
      });

      res.json(commentWithUser);
    } catch (error) {
      console.error("Failed to create comment:", error);
      res.status(500).json({ 
        message: "Failed to create comment",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Events routes
  app.get("/api/events", async (_req, res) => {
    try {
      const allEvents = await db.query.events.findMany({
        with: {
          organization: true,
        },
        orderBy: (events, { desc }) => [desc(events.date)],
      });
      res.json(allEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Points of Interest routes
  app.get("/api/points-of-interest", async (_req, res) => {
    try {
      const pois = await db.query.pointsOfInterest.findMany();
      res.json(pois);
    } catch (error) {
      console.error("Failed to fetch points of interest:", error);
      res.status(500).json({ message: "Failed to fetch points of interest" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (_req, res) => {
    try {
      const allResources = await db.query.resources.findMany();
      res.json(allResources);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  // Organizations routes
  app.post("/api/organizations/verify", requireAuth, async (req, res) => {
    const { name, website, email } = req.body;

    if (!name || !website || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!email.includes("@") || !email.includes(".")) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    let websiteUrl = website;
    if (!website.startsWith('http://') && !website.startsWith('https://')) {
      websiteUrl = `https://${website}`;
    }

    try {
      new URL(websiteUrl);
    } catch {
      return res.status(400).json({ message: "Invalid website URL" });
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
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}