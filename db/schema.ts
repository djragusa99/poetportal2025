import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  display_name: text("display_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  display_name: z.string().optional(),
});

export const selectUserSchema = createSelectSchema(users);

// Posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  postId: integer("post_id").references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  parentId: integer("parent_id").references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Messages table for direct messaging
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  receiverId: integer("receiver_id").references(() => users.id, { onDelete: 'cascade' }).notNull(),
  read: timestamp("read"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Export types
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;

// Relations configuration
export const relations = {
  users: {
    posts: {
      references: [users.id],
      foreignKey: [posts.userId],
    },
    comments: {
      references: [users.id],
      foreignKey: [comments.userId],
    },
    sentMessages: {
      references: [users.id],
      foreignKey: [messages.senderId],
    },
    receivedMessages: {
      references: [users.id],
      foreignKey: [messages.receiverId],
    },
  },
  posts: {
    user: {
      references: [users.id],
      foreignKey: [posts.userId],
    },
    comments: {
      references: [posts.id],
      foreignKey: [comments.postId],
    },
  },
  comments: {
    user: {
      references: [users.id],
      foreignKey: [comments.userId],
    },
    post: {
      references: [posts.id],
      foreignKey: [comments.postId],
    },
    parent: {
      references: [comments.id],
      foreignKey: [comments.parentId],
    },
  },
  messages: {
    sender: {
      references: [users.id],
      foreignKey: [messages.senderId],
    },
    receiver: {
      references: [users.id],
      foreignKey: [messages.receiverId],
    },
  },
};