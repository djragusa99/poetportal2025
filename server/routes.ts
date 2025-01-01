import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { users, events, pointsOfInterest, resources, comments, posts, followers } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
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

  // New route for suspending/unsuspending users
  app.post("/api/admin/users/:id/suspend", authenticateToken, isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { is_suspended } = req.body;

    try {
      // Check if user exists and is not an admin
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.is_admin) {
        return res.status(403).json({ message: "Cannot suspend admin users" });
      }

      const [updatedUser] = await db
        .update(users)
        .set({ is_suspended })
        .where(eq(users.id, userId))
        .returning();

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user suspension status:", error);
      res.status(500).json({ message: "Failed to update user suspension status" });
    }
  });

  // New route for deleting users
  app.delete("/api/admin/users/:id", authenticateToken, isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);

    try {
      // Check if user exists and is not an admin
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.is_admin) {
        return res.status(403).json({ message: "Cannot delete admin users" });
      }

      await db
        .delete(users)
        .where(eq(users.id, userId));

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Comments routes
  app.post("/api/posts/:postId/comments", authenticateToken, async (req, res) => {
    const postId = parseInt(req.params.postId);
    const { content, parentId } = req.body;
    const userId = req.user?.id;

    try {
      const [comment] = await db.insert(comments)
        .values({
          content,
          post_id: postId,
          user_id: userId,
          parent_id: parentId || null,
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
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:id", authenticateToken, async (req, res) => {
    const commentId = parseInt(req.params.id);
    const userId = req.user?.id;

    try {
      const [comment] = await db
        .select()
        .from(comments)
        .where(eq(comments.id, commentId))
        .limit(1);

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      if (comment.user_id !== userId && !req.user?.is_admin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      await db.delete(comments).where(eq(comments.id, commentId));
      res.json({ message: "Comment deleted successfully" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
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

  app.post("/api/posts", authenticateToken, async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user?.id;

    try {
      const [post] = await db.insert(posts)
        .values({
          title,
          content,
          user_id: userId,
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
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  app.get("/api/posts", authenticateToken, async (_req, res) => {
    try {
      const allPosts = await db.query.posts.findMany({
        with: {
          user: {
            columns: {
              id: true,
              username: true,
              display_name: true,
            },
          },
          comments: {
            with: {
              user: {
                columns: {
                  id: true,
                  username: true,
                  display_name: true,
                },
              },
            },
            orderBy: desc(comments.created_at),
          },
        },
        orderBy: desc(posts.created_at),
      });

      res.json(allPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });


  const httpServer = createServer(app);
  // Follow routes
  app.get("/api/users/:userId/following", authenticateToken, async (req, res) => {
    const followerId = req.user?.id;
    const followingId = parseInt(req.params.userId);
    
    if (!followerId || !followingId || isNaN(followingId)) {
      return res.status(400).json({ message: "Invalid user IDs", isFollowing: false });
    }

    try {
      const [isFollowing] = await db.select()
        .from(followers)
        .where(and(
          eq(followers.follower_id, followerId),
          eq(followers.following_id, followingId)
        ))
        .limit(1);

      res.json({ isFollowing: !!isFollowing });
    } catch (error) {
      console.error("Error checking follow status:", error);
      res.status(500).json({ message: "Failed to check follow status" });
    }
  });

  app.post("/api/users/:userId/follow", authenticateToken, async (req, res) => {
    try {
      const followerId = req.user?.id;
      const followingId = parseInt(req.params.userId);

      if (!followerId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      if (!followingId || isNaN(followingId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }

      if (followerId === followingId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      // Validate user exists
      const [targetUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, followingId))
        .limit(1);

      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check if already following
      const existingFollow = await db
        .select()
        .from(followers)
        .where(and(
          eq(followers.follower_id, followerId),
          eq(followers.following_id, followingId)
        ))
        .limit(1);

      if (existingFollow.length > 0) {
        await db.delete(followers)
          .where(and(
            eq(followers.follower_id, followerId),
            eq(followers.following_id, followingId)
          ));
        return res.json({ message: "Successfully unfollowed user", following: false });
      }

      // Insert follow relationship
      await db.insert(followers)
        .values({
          follower_id: followerId,
          following_id: followingId,
        });

      res.json({ message: "Successfully followed user", following: true });
    } catch (error) {
      console.error("Error following user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  app.delete("/api/users/:userId/follow", authenticateToken, async (req, res) => {
    const followerId = req.user?.id;
    const followingId = parseInt(req.params.userId);

    try {
      await db.delete(followers)
        .where(and(
          eq(followers.follower_id, followerId),
          eq(followers.following_id, followingId)
        ));

      res.json({ message: "Successfully unfollowed user" });
    } catch (error) {
      console.error("Error unfollowing user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  return httpServer;
}