import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations, sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  pronouns: text("pronouns"),
  bio: text("bio"),
  email: text("email").notNull(),
  location: text("location").notNull(),
  userType: text("user_type").notNull(),
  avatar: text("avatar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  parentId: integer("parent_id").references(() => comments.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  website: text("website"),
  email: text("email").notNull(),
  verified: boolean("verified").default(false),
  verificationToken: text("verification_token"),
  verificationTokenExpiry: timestamp("verification_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const pointsOfInterest = pgTable("points_of_interest", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  location: text("location").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  link: text("link").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  organizations: many(organizations),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, {
    fields: [posts.userId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
  parentComment: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
    relationName: "comment_parent",
  }),
  childComments: many(comments, {
    relationName: "comment_parent",
  }),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  user: one(users, {
    fields: [organizations.userId],
    references: [users.id],
  }),
  events: many(events),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  organization: one(organizations, {
    fields: [events.organizationId],
    references: [organizations.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertOrganizationSchema = createInsertSchema(organizations);
export const selectOrganizationSchema = createSelectSchema(organizations);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
export type PointOfInterest = typeof pointsOfInterest.$inferSelect;
export type Resource = typeof resources.$inferSelect;