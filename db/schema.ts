import { pgTable, text, serial } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  display_name: text("display_name"),
});

// Schema validation
export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(50),
  password: z.string().min(6),
  display_name: z.string().optional(),
});

export const selectUserSchema = createSelectSchema(users);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;