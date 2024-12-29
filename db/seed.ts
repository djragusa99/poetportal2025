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

    // Create test users
    console.log("Creating users...");
    const testUsers = [
      {
        username: "testuser",
        password: await hashPassword("testpass123"),
      },
      {
        username: "demouser",
        password: await hashPassword("demopass123"),
      },
    ];

    for (const user of testUsers) {
      try {
        const [created] = await db.insert(users).values(user).returning();
        console.log(`✓ Created user: ${user.username}`);
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

// Only seed when this file is imported and used
if (process.env.SEED_DB === 'true') {
  seed().catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
}