import { db } from "@db";
import { users, posts, comments, events, pointsOfInterest, resources, follows, likes } from "@db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from 'drizzle-orm';

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

    // Create my test account first
    const testUsers = [
      {
        username: "DamonRagusa",
        password: await hashPassword("password123"),
        first_name: "Damon",
        last_name: "Ragusa",
        email: "djragusa@gmail.com",
        location: "Cincinnati, OH",
        user_type: "User",
        bio: "I love me some poetry!",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=damonragusa",
        suspended: false,
        created_at: new Date(),
      }
    ];

    // Create test user account
    const createdTestUsers = [];
    for (const user of testUsers) {
      try {
        const [created] = await db.insert(users).values([user]).returning();
        createdTestUsers.push(created);
        console.log(`✓ Created test user: ${user.username}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`User ${user.username} already exists, skipping...`);
          const [existing] = await db.select().from(users).where(eq(users.username, user.username));
          createdTestUsers.push(existing);
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

if (process.env.SEED_DB === 'true') {
  seed().catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
}