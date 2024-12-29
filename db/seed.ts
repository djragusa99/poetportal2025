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
        const [created] = await db.insert(users).values(user).returning();
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

    // Create poet users
    console.log("Creating poet users...");
    const poetUsers = [
      {
        username: "emilyd",
        password: await hashPassword("password123"),
        first_name: "Emily",
        last_name: "Dickinson",
        email: "emily@poetportal.com",
        location: "Amherst, Massachusetts",
        user_type: "Poet",
        pronouns: "she/her",
        bio: "American poet known for her unique style and reclusive nature.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=emilydickinson",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "waltw",
        password: await hashPassword("password123"),
        first_name: "Walt",
        last_name: "Whitman",
        email: "walt@poetportal.com",
        location: "Camden, New Jersey",
        user_type: "Poet",
        pronouns: "he/him",
        bio: "American poet, essayist and journalist. Father of free verse.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=waltwhitman",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "robertf",
        password: await hashPassword("password123"),
        first_name: "Robert",
        last_name: "Frost",
        email: "robert@poetportal.com",
        location: "Boston, Massachusetts",
        user_type: "Poet",
        pronouns: "he/him",
        bio: "American poet known for realistic depictions of rural life.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=robertfrost",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "langston",
        password: await hashPassword("password123"),
        first_name: "Langston",
        last_name: "Hughes",
        email: "langston@poetportal.com",
        location: "Harlem, New York",
        user_type: "Poet",
        pronouns: "he/him",
        bio: "American poet, social activist, and leading figure of the Harlem Renaissance.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=langstonhughes",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "mayaa",
        password: await hashPassword("password123"),
        first_name: "Maya",
        last_name: "Angelou",
        email: "maya@poetportal.com",
        location: "Winston-Salem, North Carolina",
        user_type: "Poet",
        pronouns: "she/her",
        bio: "American poet, memoirist, and civil rights activist.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mayaangelou",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "williamb",
        password: await hashPassword("password123"),
        first_name: "William",
        last_name: "Blake",
        email: "william@poetportal.com",
        location: "London, England",
        user_type: "Poet",
        pronouns: "he/him",
        bio: "English poet, painter, and printmaker of the Romantic Age.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=williamblake",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "pabloner",
        password: await hashPassword("password123"),
        first_name: "Pablo",
        last_name: "Neruda",
        email: "pablo@poetportal.com",
        location: "Santiago, Chile",
        user_type: "Poet",
        pronouns: "he/him",
        bio: "Chilean poet-diplomat and politician, Nobel Prize laureate.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=pabloneruda",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "sylviap",
        password: await hashPassword("password123"),
        first_name: "Sylvia",
        last_name: "Plath",
        email: "sylvia@poetportal.com",
        location: "London, England",
        user_type: "Poet",
        pronouns: "she/her",
        bio: "American poet, novelist, and short story writer.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sylviaplath",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "federicgl",
        password: await hashPassword("password123"),
        first_name: "Federico",
        last_name: "García Lorca",
        email: "federico@poetportal.com",
        location: "Granada, Spain",
        user_type: "Poet",
        pronouns: "he/him",
        bio: "Spanish poet, playwright, and theatre director.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=federicogarcialorca",
        suspended: false,
        created_at: new Date(),
      },
      {
        username: "annes",
        password: await hashPassword("password123"),
        first_name: "Anne",
        last_name: "Sexton",
        email: "anne@poetportal.com",
        location: "Weston, Massachusetts",
        user_type: "Poet",
        pronouns: "she/her",
        bio: "American poet known for her highly personal, confessional verse.",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=annesexton",
        suspended: false,
        created_at: new Date(),
      },
    ];

    const createdPoetUsers = [];
    for (const user of poetUsers) {
      try {
        const [created] = await db.insert(users).values(user).returning();
        createdPoetUsers.push(created);
        console.log(`✓ Created user: ${user.username}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`User ${user.username} already exists, skipping...`);
          const [existing] = await db.select().from(users).where(eq(users.username, user.username));
          createdPoetUsers.push(existing);
        } else {
          throw error;
        }
      }
    }

    // Combine all users for reference in other seed data
    const allUsers = [...createdTestUsers, ...createdPoetUsers];

    // Create events
    console.log("Creating events...");
    const poetryEvents = [
      {
        title: "National Poetry Month Festival",
        description: "A month-long celebration of poetry featuring workshops, readings, and performances.",
        date: new Date("2024-04-01"),
        location: "Various locations across USA",
        organizer_id: allUsers[0].id,
        type: "Festival",
        created_at: new Date(),
      },
      {
        title: "Frost Poetry Festival",
        description: "Annual celebration of Robert Frost's poetry in his beloved New England.",
        date: new Date("2024-07-15"),
        location: "Derry, New Hampshire",
        organizer_id: allUsers[2].id,
        type: "Festival",
        created_at: new Date(),
      },
      {
        title: "Pablo Neruda International Poetry Symposium",
        description: "A gathering of poets and scholars discussing the impact of Neruda's work.",
        date: new Date("2024-09-23"),
        location: "Santiago, Chile",
        organizer_id: allUsers[6].id,
        type: "Conference",
        created_at: new Date(),
      },
      {
        title: "Beat Poetry Revival",
        description: "Contemporary poets perform and discuss the influence of Beat Generation poetry.",
        date: new Date("2024-06-05"),
        location: "San Francisco, CA",
        organizer_id: allUsers[1].id,
        type: "Performance",
        created_at: new Date(),
      },
      {
        title: "Harlem Renaissance Poetry Week",
        description: "Celebrating the poetic legacy of the Harlem Renaissance.",
        date: new Date("2024-05-20"),
        location: "Harlem, New York",
        organizer_id: allUsers[3].id,
        type: "Festival",
        created_at: new Date(),
      },
      {
        title: "Emily Dickinson Poetry Marathon",
        description: "24-hour reading of Emily Dickinson's complete works.",
        date: new Date("2024-08-10"),
        location: "Amherst, Massachusetts",
        organizer_id: allUsers[0].id,
        type: "Reading",
        created_at: new Date(),
      },
      {
        title: "International Women Poets Symposium",
        description: "Celebrating the contributions of women to poetry throughout history.",
        date: new Date("2024-03-08"),
        location: "London, UK",
        organizer_id: allUsers[7].id,
        type: "Conference",
        created_at: new Date(),
      },
      {
        title: "Poetry in Translation Festival",
        description: "Exploring poetry across languages and cultures.",
        date: new Date("2024-10-15"),
        location: "Paris, France",
        organizer_id: allUsers[6].id,
        type: "Festival",
        created_at: new Date(),
      },
      {
        title: "Spoken Word Championship",
        description: "Annual competition featuring the best spoken word artists.",
        date: new Date("2024-11-01"),
        location: "Chicago, IL",
        organizer_id: allUsers[3].id,
        type: "Competition",
        created_at: new Date(),
      },
      {
        title: "Digital Poetry and New Media Conference",
        description: "Exploring the intersection of poetry and technology.",
        date: new Date("2024-12-05"),
        location: "Berlin, Germany",
        organizer_id: allUsers[5].id,
        type: "Conference",
        created_at: new Date(),
      },
    ];

    await db.insert(events).values(poetryEvents);
    console.log("✓ Created events");

    // Create points of interest
    console.log("Creating points of interest...");
    const poetryLocations = [
      {
        name: "Emily Dickinson Museum",
        description: "The poet's home and gardens, offering tours and educational programs.",
        type: "Museum",
        location: "280 Main St, Amherst, MA",
        created_by_id: allUsers[0].id,
        url: "https://www.emilydickinsonmuseum.org/",
        created_at: new Date(),
      },
      {
        name: "Walt Whitman Birthplace State Historic Site",
        description: "Preserved birthplace of Walt Whitman with exhibits and programs.",
        type: "Historic Site",
        location: "246 Old Walt Whitman Rd, Huntington Station, NY",
        created_by_id: allUsers[1].id,
        url: "https://www.waltwhitman.org/",
        created_at: new Date(),
      },
      {
        name: "The Robert Frost Stone House Museum",
        description: "Historic home where Frost wrote some of his most famous poems.",
        type: "Museum",
        location: "121 Historic Route 7A, Shaftsbury, VT",
        created_by_id: allUsers[2].id,
        url: "https://www.bennington.edu/robert-frost-stone-house-museum",
        created_at: new Date(),
      },
      {
        name: "Langston Hughes House",
        description: "Historic brownstone where Hughes spent the last 20 years of his life.",
        type: "Historic Site",
        location: "20 East 127th Street, New York, NY",
        created_by_id: allUsers[3].id,
        url: "https://www.nycgo.com/attractions/langston-hughes-house",
        created_at: new Date(),
      },
      {
        name: "The Poetry Foundation",
        description: "Modern building housing the Poetry Foundation and Poetry magazine.",
        type: "Cultural Center",
        location: "61 West Superior Street, Chicago, IL",
        created_by_id: allUsers[4].id,
        url: "https://www.poetryfoundation.org/",
        created_at: new Date(),
      },
      {
        name: "William Blake's House",
        description: "Site of Blake's only surviving London home.",
        type: "Historic Site",
        location: "17 South Molton Street, London, UK",
        created_by_id: allUsers[5].id,
        url: "https://www.english-heritage.org.uk/",
        created_at: new Date(),
      },
      {
        name: "Pablo Neruda's La Sebastiana",
        description: "One of Neruda's three houses in Chile, with stunning views of Valparaíso.",
        type: "Museum",
        location: "Ricardo de Ferrari 692, Valparaíso, Chile",
        created_by_id: allUsers[6].id,
        url: "https://fundacionneruda.org/en/museums/la-sebastiana-museum-house/",
        created_at: new Date(),
      },
      {
        name: "Sylvia Plath's Grave",
        description: "Final resting place of the poet in Heptonstall, Yorkshire.",
        type: "Memorial",
        location: "St Thomas a Becket churchyard, Heptonstall, UK",
        created_by_id: allUsers[7].id,
        url: "https://www.visitcalderdale.com/",
        created_at: new Date(),
      },
      {
        name: "Federico García Lorca Center",
        description: "Cultural center dedicated to the poet's life and work.",
        type: "Cultural Center",
        location: "Plaza de la Romanilla, Granada, Spain",
        created_by_id: allUsers[8].id,
        url: "https://www.huertadesanvicente.com/",
        created_at: new Date(),
      },
      {
        name: "City Lights Bookstore",
        description: "Historic bookstore and publisher founded by Lawrence Ferlinghetti.",
        type: "Bookstore",
        location: "261 Columbus Avenue, San Francisco, CA",
        created_by_id: allUsers[9].id,
        url: "https://citylights.com/",
        created_at: new Date(),
      },
    ];

    await db.insert(pointsOfInterest).values(poetryLocations);
    console.log("✓ Created points of interest");

    // Create resources
    console.log("Creating resources...");
    const poetryResources = [
      {
        title: "Poetry Foundation",
        description: "Comprehensive poetry archive and publisher of Poetry magazine.",
        type: "Website",
        url: "https://www.poetryfoundation.org",
        created_at: new Date(),
      },
      {
        title: "Academy of American Poets",
        description: "Largest membership-based nonprofit organization fostering poetry.",
        type: "Organization",
        url: "https://poets.org",
        created_at: new Date(),
      },
      {
        title: "Poetry Society of America",
        description: "Nation's oldest poetry organization for poetry advocacy and education.",
        type: "Organization",
        url: "https://poetrysociety.org",
        created_at: new Date(),
      },
      {
        title: "The Poetry Archive",
        description: "World's premier online collection of recordings of poets reading their work.",
        type: "Digital Archive",
        url: "https://www.poetryarchive.org",
        created_at: new Date(),
      },
      {
        title: "Button Poetry",
        description: "Digital platform promoting performance poetry and spoken word.",
        type: "Media Platform",
        url: "https://buttonpoetry.com",
        created_at: new Date(),
      },
      {
        title: "Poetry International Web",
        description: "Platform for international poetry exchange and translation.",
        type: "Website",
        url: "https://www.poetryinternational.org",
        created_at: new Date(),
      },
      {
        title: "Poets & Writers",
        description: "Resource for creative writers, with databases and opportunities.",
        type: "Organization",
        url: "https://www.pw.org",
        created_at: new Date(),
      },
      {
        title: "Library of Congress Poetry Resources",
        description: "National library's collection of poetry resources and archives.",
        type: "Digital Archive",
        url: "https://www.loc.gov/poetry/",
        created_at: new Date(),
      },
      {
        title: "Poetry Daily",
        description: "Daily curated selection of contemporary poetry.",
        type: "Website",
        url: "https://poems.com",
        created_at: new Date(),
      },
      {
        title: "PennSound",
        description: "Comprehensive archive of poetry recordings and performance.",
        type: "Digital Archive",
        url: "https://writing.upenn.edu/pennsound/",
        created_at: new Date(),
      },
    ];

    await db.insert(resources).values(poetryResources);
    console.log("✓ Created resources");

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