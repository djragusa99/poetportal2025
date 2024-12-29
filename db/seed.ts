import { db } from "@db";
import { users, posts } from "@db/schema";
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
    // Create sample users
    console.log("Creating users...");
    const sampleUsers = [
      {
        username: "poeticmind",
        displayName: "The Poetic Mind",
        bio: "Writing poetry since 2010",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=poeticmind",
      },
      {
        username: "versecraft",
        displayName: "Verse Craft",
        bio: "Exploring the beauty of words",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=versecraft",
      },
    ];

    const createdUsers = [];
    for (const user of sampleUsers) {
      try {
        const [created] = await db.insert(users).values(user).returning();
        createdUsers.push(created);
        console.log(`✓ Created user: ${user.username}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`User ${user.username} already exists, skipping...`);
          const [existing] = await db.select().from(users).where(eq(users.username, user.username));
          createdUsers.push(existing);
        } else {
          throw error;
        }
      }
    }

    // Create sample posts
    console.log("Creating posts...");
    const samplePosts = [
      {
        userId: createdUsers[0].id,
        content: "Just finished writing a new collection of poems about nature.",
      },
      {
        userId: createdUsers[1].id,
        content: "Working on a series of haikus inspired by urban life.",
      },
    ];

    await db.insert(posts).values(samplePosts);
    console.log("✓ Created posts");

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
    throw error;
  }
}

export const hashPasswordForAuth = hashPassword;

// Only seed when this file is imported and used
if (process.env.SEED_DB === 'true') {
  seed().catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
  });
}