import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { posts, comments, users, follows, likes, events, resources, conversations, conversationParticipants, messages } from "@db/schema";
import { type User } from "@db/schema";
import { desc, sql, and, eq, or, exists, asc } from "drizzle-orm";
import { pointsOfInterest } from "@db/schema";

// Helper to get the current user ID from session
const getCurrentUserId = (req: Express.Request): number | undefined => {
  if (!req.user) return undefined;
  return (req.user as User).id;
};

export function registerRoutes(app: Express): Server {
  // Create the HTTP server
  const httpServer = createServer(app);

  // Add your routes here, prefixed with /api
  // The authentication routes are already set up in setupAuth

  return httpServer;
}