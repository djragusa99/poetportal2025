import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  first_name: text("first_name").notNull(),
  last_name: text("last_name").notNull(),
  email: text("email").notNull(),
  location: text("location"),
  user_type: text("user_type").default("User").notNull(),
  pronouns: text("pronouns"),
  bio: text("bio"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  // Relations will be added as needed
}));

// Define schemas for validation with additional validation rules
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  location: z.string().optional(),
  user_type: z.string().optional().default("User"),
  pronouns: z.string().optional(),
  bio: z.string().optional(),
});

export const selectUserSchema = createSelectSchema(users);

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;

// Add type for Express session
declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}