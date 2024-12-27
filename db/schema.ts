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
  suspended: boolean("suspended").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followedId: integer("followed_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const usersFollowsRelations = relations(users, ({ many }) => ({
  followedBy: many(follows),
  following: many(follows),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
  }),
  followed: one(users, {
    fields: [follows.followedId],
    references: [users.id],
  }),
}));

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

export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetType: text("target_type").notNull(), // 'post' or 'comment'
  targetId: integer("target_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

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
    relationName: "parent",
  }),
  childComments: many(comments, {
    relationName: "parent",
  }),
}));

export const likesRelations = relations(likes, ({ one }) => ({
  user: one(users, {
    fields: [likes.userId],
    references: [users.id],
  }),
}));

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  location: text("location").notNull(),
  organizerId: integer("organizer_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const eventsRelations = relations(events, ({ one }) => ({
  organizer: one(users, {
    fields: [events.organizerId],
    references: [users.id],
  }),
}));

export const pointsOfInterest = pgTable("points_of_interest", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
});

export const pointsOfInterestRelations = relations(pointsOfInterest, ({ one }) => ({
  createdBy: one(users, {
    fields: [pointsOfInterest.createdById],
    references: [users.id],
  }),
}));

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertEventSchema = createInsertSchema(events);
export const selectEventSchema = createSelectSchema(events);
export const insertPointOfInterestSchema = createInsertSchema(pointsOfInterest);
export const selectPointOfInterestSchema = createSelectSchema(pointsOfInterest);
export const insertResourceSchema = createInsertSchema(resources);
export const selectResourceSchema = createSelectSchema(resources);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type NewFollow = typeof follows.$inferInsert;
export type Like = typeof likes.$inferSelect;
export type NewLike = typeof likes.$inferInsert;
export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type PointOfInterest = typeof pointsOfInterest.$inferSelect;
export type NewPointOfInterest = typeof pointsOfInterest.$inferInsert;
export type Resource = typeof resources.$inferSelect;
export type NewResource = typeof resources.$inferInsert;