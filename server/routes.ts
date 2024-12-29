import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { posts, comments, users, follows, likes, events, resources, conversations, conversationParticipants, messages } from "@db/schema";
import { generateVerificationToken, sendVerificationEmail } from "./email";
import { upload } from "./upload";
import express from "express";
import { type User } from "@db/schema";
import { desc, sql, and, eq, or, exists, asc } from "drizzle-orm";
import { pointsOfInterest } from "@db/schema";

declare module 'express-session' {
  interface SessionData {
    currentUserId?: number;
  }
}

// Helper to get the current user ID from session or fall back to mock ID
const getCurrentUserId = (req: express.Request): number => {
  return req.session.currentUserId || 1; // Fallback to mock user ID if no session
};

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Serve uploaded files statically
  app.use("/uploads", express.static("uploads"));

  // Add avatar upload endpoint
  app.post("/api/user/avatar", upload.single("avatar"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = getCurrentUserId(req);
      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      const [updatedUser] = await db
        .update(users)
        .set({ avatar: avatarUrl })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update avatar" });
      }

      return res.json({
        avatarUrl,
        user: updatedUser
      });
    } catch (error) {
      console.error("Failed to update avatar:", error);
      return res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // Follow a user
  app.post("/api/users/:userId/follow", async (req, res) => {
    try {
      const followedId = parseInt(req.params.userId);
      const followerId = getCurrentUserId(req);

      if (followerId === followedId) {
        return res.status(400).json({ message: "Cannot follow yourself" });
      }

      const [follow] = await db
        .insert(follows)
        .values({
          followerId,
          followedId,
        })
        .onConflictDoNothing()
        .returning();

      if (!follow) {
        return res.status(400).json({ message: "Already following this user" });
      }

      res.json(follow);
    } catch (error) {
      console.error("Failed to follow user:", error);
      res.status(500).json({ message: "Failed to follow user" });
    }
  });

  // Unfollow a user
  app.delete("/api/users/:userId/follow", async (req, res) => {
    try {
      const followedId = parseInt(req.params.userId);
      const followerId = getCurrentUserId(req);

      await db
        .delete(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followedId, followedId)
          )
        );

      res.json({ message: "Unfollowed successfully" });
    } catch (error) {
      console.error("Failed to unfollow user:", error);
      res.status(500).json({ message: "Failed to unfollow user" });
    }
  });

  // Check if following a user
  app.get("/api/users/:userId/following", async (req, res) => {
    try {
      const followedId = parseInt(req.params.userId);
      const followerId = getCurrentUserId(req);

      const [follow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, followerId),
            eq(follows.followedId, followedId)
          )
        )
        .limit(1);

      res.json({ following: !!follow });
    } catch (error) {
      console.error("Failed to check following status:", error);
      res.status(500).json({ message: "Failed to check following status" });
    }
  });

  // Get user's followers
  app.get("/api/users/:userId/followers", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const followers = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          avatar: users.avatar,
        })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followerId))
        .where(eq(follows.followedId, userId))
        .orderBy(desc(follows.createdAt));

      res.json(followers);
    } catch (error) {
      console.error("Failed to fetch followers:", error);
      res.status(500).json({ message: "Failed to fetch followers" });
    }
  });

  // Get users that a user is following
  app.get("/api/users/:userId/following-list", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      const following = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          avatar: users.avatar,
        })
        .from(follows)
        .innerJoin(users, eq(users.id, follows.followedId))
        .where(eq(follows.followerId, userId))
        .orderBy(desc(follows.createdAt));

      res.json(following);
    } catch (error) {
      console.error("Failed to fetch following list:", error);
      res.status(500).json({ message: "Failed to fetch following list" });
    }
  });

  // Posts routes
  app.get("/api/posts", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);

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
        orderBy: [desc(posts.createdAt)],
      });

      // Sort posts to prioritize those from followed users
      const sortedPosts = await Promise.all(
        allPosts.map(async (post) => {
          const [follow] = await db
            .select()
            .from(follows)
            .where(
              and(
                eq(follows.followerId, userId),
                eq(follows.followedId, post.userId)
              )
            )
            .limit(1);
          return { ...post, isFollowed: !!follow };
        })
      );

      sortedPosts.sort((a, b) => {
        if (a.isFollowed === b.isFollowed) {
          return new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime();
        }
        return a.isFollowed ? -1 : 1;
      });

      res.json(sortedPosts);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      res.status(500).json({ message: "Failed to fetch posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    try {
      const userId = getCurrentUserId(req);

      const [post] = await db
        .insert(posts)
        .values({
          userId,
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

  app.delete("/api/posts/:postId", async (req, res) => {
    const postId = parseInt(req.params.postId);

    try {
      // Check if post exists and belongs to user
      const post = await db.query.posts.findFirst({
        where: eq(posts.id, postId),
      });

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const userId = getCurrentUserId(req);
      if (post.userId !== userId) {
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
  app.post("/api/posts/:postId/comments", async (req, res) => {
    const { content, parentId } = req.body;
    const postId = parseInt(req.params.postId);

    if (!content) {
      return res.status(400).json({ message: "Content is required" });
    }

    try {
      const userId = getCurrentUserId(req);

      const [comment] = await db
        .insert(comments)
        .values({
          postId,
          userId,
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
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.delete("/api/comments/:commentId", async (req, res) => {
    const commentId = parseInt(req.params.commentId);

    try {
      // Check if comment exists and belongs to user
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment) {
        return res.status(404).json({ message: "Comment not found" });
      }

      const userId = getCurrentUserId(req);
      if (comment.userId !== userId) {
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

  // Like/unlike a post or comment
  app.post("/api/likes", async (req, res) => {
    try {
      const { targetType, targetId } = req.body;
      const userId = getCurrentUserId(req);

      if (!targetType || !targetId) {
        return res.status(400).json({ message: "Missing target type or ID" });
      }

      if (!["post", "comment"].includes(targetType)) {
        return res.status(400).json({ message: "Invalid target type" });
      }

      // Check if the target content exists and belongs to the current user
      let contentOwnerId;
      if (targetType === 'post') {
        const post = await db.query.posts.findFirst({
          where: eq(posts.id, targetId),
        });
        if (!post) {
          return res.status(404).json({ message: "Post not found" });
        }
        contentOwnerId = post.userId;
      } else {
        const comment = await db.query.comments.findFirst({
          where: eq(comments.id, targetId),
        });
        if (!comment) {
          return res.status(404).json({ message: "Comment not found" });
        }
        contentOwnerId = comment.userId;
      }

      if (contentOwnerId === userId) {
        return res.status(400).json({ message: "You cannot like your own content" });
      }

      // Check if like already exists
      const [existingLike] = await db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.targetType, targetType),
            eq(likes.targetId, targetId)
          )
        )
        .limit(1);

      if (existingLike) {
        // Unlike: remove the like
        await db
          .delete(likes)
          .where(eq(likes.id, existingLike.id));

        return res.json({ liked: false });
      }

      // Like: create new like
      await db
        .insert(likes)
        .values({
          userId,
          targetType,
          targetId,
        });

      res.json({ liked: true });
    } catch (error) {
      console.error("Failed to toggle like:", error);
      res.status(500).json({ message: "Failed to toggle like" });
    }
  });

  // Get like status and count for a post or comment
  app.get("/api/likes/:targetType/:targetId", async (req, res) => {
    try {
      const { targetType, targetId } = req.params;
      const userId = getCurrentUserId(req);

      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(likes)
        .where(
          and(
            eq(likes.targetType, targetType),
            eq(likes.targetId, parseInt(targetId))
          )
        );

      const [userLike] = await db
        .select()
        .from(likes)
        .where(
          and(
            eq(likes.userId, userId),
            eq(likes.targetType, targetType),
            eq(likes.targetId, parseInt(targetId))
          )
        )
        .limit(1);

      res.json({
        count: count[0].count,
        liked: !!userLike,
      });
    } catch (error) {
      console.error("Failed to get like status:", error);
      res.status(500).json({ message: "Failed to get like status" });
    }
  });

  // Admin routes for user management
  app.get("/api/admin/users", async (_req, res) => {
    try {
      const allUsers = await db.query.users.findMany({
        orderBy: (users, { asc }) => [asc(users.id)],
      });
      res.json(allUsers);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const updates: Partial<User> = req.body;

    // Remove sensitive fields that shouldn't be updated
    delete updates.id;
    delete updates.password;
    delete updates.createdAt;

    try {
      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to update user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/admin/users/:userId", async (req, res) => {
    const userId = parseInt(req.params.userId);

    try {
      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Delete the user's content first
      await db.delete(posts).where(eq(posts.userId, userId));
      await db.delete(comments).where(eq(comments.userId, userId));
      await db.delete(likes).where(eq(likes.userId, userId));
      await db.delete(follows).where(
        or(
          eq(follows.followerId, userId),
          eq(follows.followedId, userId)
        )
      );

      // Delete the user
      await db.delete(users).where(eq(users.id, userId));

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Add suspension endpoint
  app.post("/api/admin/users/:userId/suspend", async (req, res) => {
    const userId = parseInt(req.params.userId);
    const { suspended } = req.body;

    if (typeof suspended !== 'boolean') {
      return res.status(400).json({ message: "Invalid suspension status" });
    }

    try {
      const [updatedUser] = await db
        .update(users)
        .set({ suspended })
        .where(eq(users.id, userId))
        .returning();

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Failed to update user suspension status:", error);
      res.status(500).json({ message: "Failed to update user suspension status" });
    }
  });

  // Points of Interest routes
  app.get("/api/points-of-interest", async (_req, res) => {
    try {
      const points = await db.query.pointsOfInterest.findMany({
        with: {
          createdBy: true,
        },
        orderBy: (pointsOfInterest, { desc }) => [desc(pointsOfInterest.createdAt)],
      });

      res.json(points);
    } catch (error) {
      console.error("Failed to fetch points of interest:", error);
      res.status(500).json({ message: "Failed to fetch points of interest" });
    }
  });

  // Events routes
  app.get("/api/events", async (_req, res) => {
    try {
      const allEvents = await db.query.events.findMany({
        orderBy: (events, { asc }) => [asc(events.date)],
      });
      res.json(allEvents);
    } catch (error) {
      console.error("Failed to fetch events:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  // Resources routes
  app.get("/api/resources", async (_req, res) => {
    try {
      const allResources = await db.query.resources.findMany({
        orderBy: (resources, { asc }) => [asc(resources.title)],
      });
      res.json(allResources);
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      res.status(500).json({ message: "Failed to fetch resources" });
    }
  });

  /**
   * Create a new conversation between users
   * POST /api/conversations
   * Body: { participantIds: number[] }
   */
  app.post("/api/conversations", async (req, res) => {
    try {
      const currentUserId = getCurrentUserId(req);
      const { participantIds } = req.body;

      if (!Array.isArray(participantIds) || participantIds.length === 0) {
        return res.status(400).json({ message: "Invalid participant list" });
      }

      // Create conversation
      const [conversation] = await db
        .insert(conversations)
        .values({})
        .returning();

      // Add participants including the current user
      const uniqueParticipants = [...new Set([currentUserId, ...participantIds])];
      await db.insert(conversationParticipants).values(
        uniqueParticipants.map(userId => ({
          conversationId: conversation.id,
          userId,
        }))
      );

      const conversationWithParticipants = await db.query.conversations.findFirst({
        where: eq(conversations.id, conversation.id),
        with: {
          participants: {
            with: {
              user: true,
            },
          },
        },
      });

      res.json(conversationWithParticipants);
    } catch (error) {
      console.error("Failed to create conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  /**
   * Get all conversations for the current user
   * GET /api/conversations
   */
  app.get("/api/conversations", async (req, res) => {
    try {
      const currentUserId = getCurrentUserId(req);

      const userConversations = await db
        .select({
          conversation: conversations,
          participants: conversationParticipants,
          lastMessage: db
            .select()
            .from(messages)
            .where(eq(messages.conversationId, conversations.id))
            .orderBy(desc(messages.createdAt))
            .limit(1),
        })
        .from(conversations)
        .innerJoin(
          conversationParticipants,
          eq(conversations.id, conversationParticipants.conversationId)
        )
        .where(eq(conversationParticipants.userId, currentUserId))
        .orderBy(desc(conversations.updatedAt));

      res.json(userConversations);
    } catch (error) {
      console.error("Failed to fetch conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  /**
   * Send a message in a conversation
   * POST /api/conversations/:conversationId/messages
   * Body: { content: string }
   */
  app.post("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const senderId = getCurrentUserId(req);
      const { content } = req.body;

      if (!content) {
        return res.status(400).json({ message: "Message content is required" });
      }

      // Verify user is part of conversation
      const [participant] = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, senderId)
          )
        )
        .limit(1);

      if (!participant) {
        return res.status(403).json({ message: "Not a participant in this conversation" });
      }

      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          conversationId,
          senderId,
          content,
        })
        .returning();

      // Update conversation timestamp
      await db
        .update(conversations)
        .set({ updatedAt: new Date() })
        .where(eq(conversations.id, conversationId));

      const messageWithSender = await db.query.messages.findFirst({
        where: eq(messages.id, message.id),
        with: {
          sender: true,
        },
      });

      res.json(messageWithSender);
    } catch (error) {
      console.error("Failed to send message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  /**
   * Get messages in a conversation
   * GET /api/conversations/:conversationId/messages
   * Query params: 
   * - before: timestamp (for pagination)
   * - limit: number (default 50)
   */
  app.get("/api/conversations/:conversationId/messages", async (req, res) => {
    try {
      const conversationId = parseInt(req.params.conversationId);
      const currentUserId = getCurrentUserId(req);
      const before = req.query.before as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

      // Verify user is part of conversation
      const [participant] = await db
        .select()
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, currentUserId)
          )
        )
        .limit(1);

      if (!participant) {
        return res.status(403).json({ message: "Not a participant in this conversation" });
      }

      // Update last read timestamp
      await db
        .update(conversationParticipants)
        .set({ lastReadAt: new Date() })
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, currentUserId)
          )
        );

      // Fetch messages with pagination
      const conversationMessages = await db.query.messages.findMany({
        where: and(
          eq(messages.conversationId, conversationId),
          before ? sql`${messages.createdAt} < ${before}` : undefined
        ),
        with: {
          sender: true,
        },
        orderBy: desc(messages.createdAt),
        limit,
      });

      res.json(conversationMessages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  /**
   * Get unread message count
   * GET /api/conversations/unread
   */
  app.get("/api/conversations/unread", async (req, res) => {
    try {
      const currentUserId = getCurrentUserId(req);

      const unreadCounts = await db
        .select({
          conversationId: conversations.id,
          unreadCount: sql<number>`count(*)`,
        })
        .from(conversations)
        .innerJoin(
          conversationParticipants,
          eq(conversations.id, conversationParticipants.conversationId)
        )
        .innerJoin(
          messages,
          and(
            eq(messages.conversationId, conversations.id),
            sql`${messages.createdAt} > COALESCE(${conversationParticipants.lastReadAt}, '1970-01-01')`
          )
        )
        .where(eq(conversationParticipants.userId, currentUserId))
        .groupBy(conversations.id);

      res.json(unreadCounts);
    } catch (error) {
      console.error("Failed to fetch unread counts:", error);
      res.status(500).json({ message: "Failed to fetch unread counts" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}