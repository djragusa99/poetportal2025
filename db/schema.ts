import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  display_name: text("display_name"),
  is_admin: boolean("is_admin").default(false).notNull(),
  is_suspended: boolean("is_suspended").default(false).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Schema validation with zod
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  display_name: z.string().optional(),
  is_admin: z.boolean().optional(),
  is_suspended: z.boolean().optional(),
});

export const selectUserSchema = createSelectSchema(users);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  // Empty relations object since we're not implementing messaging
}));