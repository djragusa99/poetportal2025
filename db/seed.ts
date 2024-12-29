import { db } from "@db";
import { users } from "@db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function seed() {
  console.log("🌱 Starting database seeding process...");

  try {
    // Create admin user
    console.log("Creating admin user...");
    const adminUser = {
      username: "admin",
      password: await hashPassword("admin123"),
      display_name: "Admin User",
      is_admin: true,
      is_suspended: false
    };

    try {
      const [adminCreated] = await db
        .insert(users)
        .values(adminUser)
        .returning();
      console.log(`✓ Created admin user: ${adminCreated.username}`);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`User ${adminUser.username} already exists, skipping...`);
      } else {
        throw error;
      }
    }

    // Create test user
    console.log("Creating test user...");
    const testUser = {
      username: "test",
      password: await hashPassword("test123"),
      display_name: "Test User",
      is_admin: false,
      is_suspended: false
    };

    try {
      const [created] = await db
        .insert(users)
        .values(testUser)
        .returning();
      console.log(`✓ Created test user: ${created.username}`);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`User ${testUser.username} already exists, skipping...`);
      } else {
        throw error;
      }
    }

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

// Run seeding
seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});