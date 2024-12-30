import { pgTable, text, serial, timestamp, boolean, integer, date } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  display_name: text("display_name"),
  bio: text("bio"),
  is_admin: boolean("is_admin").default(false).notNull(),
  is_suspended: boolean("is_suspended").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  date: date("date").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by: integer("created_by").references(() => users.id),
});

// Conversations table
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title"), // Optional, for group conversations
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Conversation participants table
export const conversationParticipants = pgTable("conversation_participants", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id").references(() => conversations.id).notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  last_read_at: timestamp("last_read_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversation_id: integer("conversation_id").references(() => conversations.id).notNull(),
  sender_id: integer("sender_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Points of Interest table
export const pointsOfInterest = pgTable("points_of_interest", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  link: text("link").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by: integer("created_by").references(() => users.id),
});

// Resources table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  link: text("link").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by: integer("created_by").references(() => users.id),
});

// Posts table
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
});

// Comments table
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  post_id: integer("post_id").references(() => posts.id).notNull(),
  parent_id: integer("parent_id").references(() => comments.id),
});

// Schema validation with zod
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  display_name: z.string().optional(),
  bio: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_suspended: z.boolean().optional(),
});

// Message-related schemas
export const insertConversationSchema = createInsertSchema(conversations);
export const insertMessageSchema = createInsertSchema(messages);
export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants);

export const selectConversationSchema = createSelectSchema(conversations);
export const selectMessageSchema = createSelectSchema(messages);
export const selectConversationParticipantSchema = createSelectSchema(conversationParticipants);

// Other schemas
export const insertEventSchema = createInsertSchema(events);
export const insertPointOfInterestSchema = createInsertSchema(pointsOfInterest);
export const insertResourceSchema = createInsertSchema(resources);
export const insertPostSchema = createInsertSchema(posts);

export const selectUserSchema = createSelectSchema(users);
export const selectEventSchema = createSelectSchema(events);
export const selectPointOfInterestSchema = createSelectSchema(pointsOfInterest);
export const selectResourceSchema = createSelectSchema(resources);
export const selectPostSchema = createSelectSchema(posts);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type InsertConversationParticipant = typeof conversationParticipants.$inferInsert;
export type PointOfInterest = typeof pointsOfInterest.$inferSelect;
export type InsertPointOfInterest = typeof pointsOfInterest.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type InsertPost = typeof posts.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  events: many(events),
  pointsOfInterest: many(pointsOfInterest),
  resources: many(resources),
  sentMessages: many(messages, { relationName: "sender" }),
  participatedConversations: many(conversationParticipants),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  participants: many(conversationParticipants),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversation_id],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.sender_id],
    references: [users.id],
  }),
}));

export const conversationParticipantsRelations = relations(conversationParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationParticipants.conversation_id],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationParticipants.user_id],
    references: [users.id],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.user_id],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  creator: one(users, {
    fields: [events.created_by],
    references: [users.id],
  }),
}));

export const pointsOfInterestRelations = relations(pointsOfInterest, ({ one }) => ({
  creator: one(users, {
    fields: [pointsOfInterest.created_by],
    references: [users.id],
  }),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  creator: one(users, {
    fields: [resources.created_by],
    references: [users.id],
  }),
}));

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  user_id: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  post_id: integer('post_id').references(() => posts.id, { onDelete: 'cascade' }).notNull(),
  parent_id: integer('parent_id').references(() => comments.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow(),
});

export const commentsRelations = relations(comments, ({ one }) => ({
  user: one(users, {
    fields: [comments.user_id],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.post_id],
    references: [posts.id],
  }),
}));