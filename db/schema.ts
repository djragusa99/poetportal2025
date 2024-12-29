import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Schema validation with proper types
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(50),
  password: z.string().min(6)
});

export const selectUserSchema = createSelectSchema(users);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;