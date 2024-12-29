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
    // First verify database connection
    await db.select().from(users).limit(1);
    console.log("✓ Database connection verified");

    // Create test accounts
    const testUsers = [
      {
        username: "testuser",
        password: await hashPassword("testpass123"),
        first_name: "Test",
        last_name: "User",
        email: "test@example.com",
        location: "San Francisco, CA",
        user_type: "User",
        bio: "A test user account",
      },
      {
        username: "admin",
        password: await hashPassword("admin123"),
        first_name: "Admin",
        last_name: "User",
        email: "admin@example.com",
        location: "New York, NY",
        user_type: "Admin",
        bio: "An admin test account",
      }
    ];

    // Create test user accounts
    for (const user of testUsers) {
      try {
        await db.insert(users).values(user);
        console.log(`✓ Created test user: ${user.username}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`User ${user.username} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

// Run seeding if called directly
if (import.meta.url === new URL(import.meta.url).href) {
  seed().catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
}