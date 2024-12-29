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

// Schema validation with zod
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  display_name: z.string().optional(),
  bio: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_suspended: z.boolean().optional(),
});

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
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.user_id],
    references: [users.id],
  }),
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