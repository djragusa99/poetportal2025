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
    // Create test user
    console.log("Creating test user...");
    const testUser = {
      username: "test",
      password: await hashPassword("test123"),
      display_name: "Test User"
    };

    try {
      const [created] = await db.insert(users).values(testUser).returning();
      console.log(`✓ Created user: ${testUser.username}`);
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

// Only seed when this file is imported and used
if (process.env.SEED_DB === 'true') {
  seed().catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
}