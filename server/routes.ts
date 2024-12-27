import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { eq } from "drizzle-orm";
import { posts, events, pointsOfInterest, resources, organizations, comments, users } from "@db/schema";
import { generateVerificationToken, sendVerificationEmail } from "./email";
import { upload } from "./upload";
import express from "express";

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

  // Serve uploaded files statically
  app.use("/uploads", express.static("uploads"));

  // Add avatar upload endpoint
  app.post("/api/user/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      // Update user's avatar in the database
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      await db
        .update(users)
        .set({ avatar: avatarUrl })
        .where(eq(users.id, req.user!.id));

      // Return JSON response with the new avatar URL
      return res.json({ avatarUrl });
    } catch (error) {
      console.error("Failed to update avatar:", error);
      return res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (_req, res) => {
    try {
      const allPosts = await db.query.posts.findMany({
        with: {
          user: true,
          comments: {
            with: {
              user: true,
              childComments: {
                with: {
                  user: true,
                },
              },
            },
            where: (comments, { isNull }) => isNull(comments.parentId),
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
              childComments: {
                with: {
                  user: true,
                },
              },
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

  app.delete("/api/posts/:postId", requireAuth, async (req, res) => {
    const postId = parseInt(req.params.postId);

    try {
      // Check if post exists and belongs to user
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      if (post.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this post" });
      }

      // Delete all comments first
      await db.delete(comments).where(eq(comments.postId, postId));

      // Delete the post
      await db.delete(posts).where(eq(posts.id, postId));

      res.json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Failed to delete post:", error);
      res.status(500).json({ message: "Failed to delete post" });
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
          childComments: {
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

  app.delete("/api/comments/:commentId", requireAuth, async (req, res) => {
    const commentId = parseInt(req.params.commentId);

    try {
      // Check if comment exists and belongs to user
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      if (comment.userId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to delete this comment" });
      }

      // Delete child comments first
      await db.delete(comments).where(eq(comments.parentId, commentId));

      // Delete the comment itself
      await db.delete(comments).where(eq(comments.id, commentId));

      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Failed to delete comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });


  // Events routes
  app.get("/api/events", async (_req, res) => {
    try {
      const allEvents = await db.query.events.findMany({
        with: {
          organization: {
            columns: {
              id: true,
              name: true,
              website: true,
              email: true,
              verified: true,
            },
          },
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
      // Generate verification token
      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = new Date();
      verificationTokenExpiry.setHours(verificationTokenExpiry.getHours() + 24); // Token expires in 24 hours

      // Create organization with verification token
      const [org] = await db
        .insert(organizations)
        .values({
          userId: req.user!.id,
          name,
          website: websiteUrl,
          email,
          verified: false,
          verificationToken,
          verificationTokenExpiry,
        })
        .returning();

      // Send verification email
      await sendVerificationEmail(email, verificationToken, name);

      res.json(org);
    } catch (error) {
      console.error("Failed to create organization:", error);
      res.status(500).json({ message: "Failed to create organization" });
    }
  });

  app.get("/api/organizations/verify/:token", async (req, res) => {
    const { token } = req.params;

    try {
      const [org] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.verificationToken, token))
        .limit(1);

      if (!org) {
        return res.status(404).json({ message: "Invalid verification token" });
      }

      if (org.verified) {
        return res.status(400).json({ message: "Organization is already verified" });
      }

      if (org.verificationTokenExpiry && new Date(org.verificationTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Verification token has expired" });
      }

      await db
        .update(organizations)
        .set({
          verified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        })
        .where(eq(organizations.id, org.id));

      res.json({ message: "Organization verified successfully" });
    } catch (error) {
      console.error("Failed to verify organization:", error);
      res.status(500).json({ message: "Failed to verify organization" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}