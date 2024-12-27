import { db } from "@db";
import { users, posts, comments, events, pointsOfInterest, resources } from "@db/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("🌱 Seeding database...");

  // Create users (famous poets)
  console.log("Creating users...");
  const poetUsers = [
    {
      username: "amandasgorman",
      password: await hashPassword("password123"),
      firstName: "Amanda",
      lastName: "Gorman",
      email: "amanda@example.com",
      location: "Los Angeles, CA",
      userType: "Poet",
      pronouns: "she/her",
      bio: "First National Youth Poet Laureate and the youngest inaugural poet in U.S. history",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=amandasgorman",
    },
    {
      username: "billyc",
      password: await hashPassword("password123"),
      firstName: "Billy",
      lastName: "Collins",
      email: "billy@example.com",
      location: "New York, NY",
      userType: "Poet",
      pronouns: "he/him",
      bio: "Former U.S. Poet Laureate known for accessible, witty poetry",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=billycollins",
    },
    {
      username: "rupikaur",
      password: await hashPassword("password123"),
      firstName: "Rupi",
      lastName: "Kaur",
      email: "rupi@example.com",
      location: "Toronto, Canada",
      userType: "Poet",
      pronouns: "she/her",
      bio: "Poet, artist, and author of 'milk and honey'",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rupikaur",
    },
    {
      username: "oceanvuong",
      password: await hashPassword("password123"),
      firstName: "Ocean",
      lastName: "Vuong",
      email: "ocean@example.com",
      location: "Northampton, MA",
      userType: "Poet",
      pronouns: "he/him",
      bio: "Award-winning poet and author of 'Night Sky with Exit Wounds'",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=oceanvuong",
    },
    {
      username: "joyharjo",
      password: await hashPassword("password123"),
      firstName: "Joy",
      lastName: "Harjo",
      email: "joy@example.com",
      location: "Tulsa, OK",
      userType: "Poet",
      pronouns: "she/her",
      bio: "23rd United States Poet Laureate and member of the Muscogee Nation",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=joyharjo",
    },
  ];

  const createdUsers = await Promise.all(
    poetUsers.map(async (user) => {
      const [created] = await db.insert(users).values(user).returning();
      return created;
    })
  );

  // Create events
  console.log("Creating events...");
  const poetryEvents = [
    {
      title: "SF Poetry Festival 2024",
      description: "Annual gathering of poets from across the Bay Area featuring readings, workshops, and open mics.",
      date: new Date("2024-04-15"),
      location: "San Francisco, CA",
      organizerId: createdUsers[0].id,
    },
    {
      title: "Poetry in the Park",
      description: "Monthly outdoor poetry reading series in Central Park.",
      date: new Date("2024-01-20"),
      location: "New York, NY",
      organizerId: createdUsers[1].id,
    },
    {
      title: "Spoken Word Workshop",
      description: "Interactive workshop on performance poetry and public speaking.",
      date: new Date("2024-02-10"),
      location: "Los Angeles, CA",
      organizerId: createdUsers[2].id,
    },
    {
      title: "Poetry & Protest",
      description: "A discussion on the role of poetry in social movements.",
      date: new Date("2024-02-28"),
      location: "Virtual Event",
      organizerId: createdUsers[0].id,
    },
    {
      title: "Youth Poetry Slam",
      description: "Competition for young poets ages 13-19.",
      date: new Date("2024-04-01"),
      location: "Chicago, IL",
      organizerId: createdUsers[1].id,
    },
  ];

  await db.insert(events).values(poetryEvents);

  // Create points of interest
  console.log("Creating points of interest...");
  const poetryLocations = [
    {
      name: "Emily Dickinson Museum",
      description: "The poet's home and gardens, offering tours and educational programs.",
      type: "Museum",
      location: "Amherst, MA",
      createdById: createdUsers[0].id,
    },
    {
      name: "City Lights Bookstore",
      description: "Historic bookstore and publisher founded by Lawrence Ferlinghetti.",
      type: "Bookstore",
      location: "San Francisco, CA",
      createdById: createdUsers[1].id,
    },
    {
      name: "Poets House",
      description: "Poetry library and literary center with over 70,000 volumes.",
      type: "Library",
      location: "New York, NY",
      createdById: createdUsers[2].id,
    },
  ];

  await db.insert(pointsOfInterest).values(poetryLocations);

  // Create resources
  console.log("Creating resources...");
  const poetryResources = [
    {
      title: "Poetry Foundation",
      description: "Comprehensive poetry archive and publisher of Poetry magazine.",
      type: "Website",
      url: "https://www.poetryfoundation.org",
    },
    {
      title: "Academy of American Poets",
      description: "Largest membership-based nonprofit organization fostering poetry.",
      type: "Organization",
      url: "https://poets.org",
    },
    {
      title: "Poets & Writers",
      description: "Database of literary magazines, grants, and contests.",
      type: "Database",
      url: "https://www.pw.org",
    },
    {
      title: "Poetry Society of America",
      description: "Oldest poetry organization in the United States.",
      type: "Organization",
      url: "https://poetrysociety.org",
    },
    {
      title: "Button Poetry",
      description: "Contemporary poetry press and digital media company.",
      type: "Publisher",
      url: "https://buttonpoetry.com",
    },
  ];

  await db.insert(resources).values(poetryResources);

  // Create posts and comments
  console.log("Creating posts and comments...");
  const poetryPosts = [
    {
      userId: createdUsers[0].id,
      content: "Excited to announce my upcoming workshop on spoken word poetry! Can't wait to share techniques and inspiration with fellow poets.",
    },
    {
      userId: createdUsers[1].id,
      content: "Just finished writing a new collection. There's something magical about completing a manuscript after months of work.",
    },
    {
      userId: createdUsers[2].id,
      content: "Poetry is healing. It's not just about writing, it's about feeling and connecting with others through words.",
    },
  ];

  const createdPosts = await Promise.all(
    poetryPosts.map(async (post) => {
      const [created] = await db.insert(posts).values(post).returning();
      return created;
    })
  );

  const poetryComments = [
    {
      postId: createdPosts[0].id,
      userId: createdUsers[3].id,
      content: "Looking forward to learning from you! Your work is incredibly inspiring.",
    },
    {
      postId: createdPosts[1].id,
      userId: createdUsers[4].id,
      content: "Congratulations! Can't wait to read it. The world needs more poetry right now.",
    },
    {
      postId: createdPosts[2].id,
      userId: createdUsers[0].id,
      content: "Couldn't agree more. Poetry has been my sanctuary through challenging times.",
    },
  ];

  await db.insert(comments).values(poetryComments);

  console.log("✅ Seeding complete!");
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});