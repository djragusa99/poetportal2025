import { db } from "@db";
import { users, events, pointsOfInterest, resources } from "@db/schema";
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
      is_suspended: false,
    };

    let adminId;
    try {
      const [adminCreated] = await db
        .insert(users)
        .values(adminUser)
        .returning();
      adminId = adminCreated.id;
      console.log(`✓ Created admin user: ${adminCreated.username}`);
    } catch (error: any) {
      if (error.code === '23505') { // Unique constraint violation
        console.log(`User ${adminUser.username} already exists, skipping...`);
      } else {
        throw error;
      }
    }

    // Create famous poet users
    console.log("Creating famous poet users...");
    const poets = [
      {
        username: "emily_dickinson",
        display_name: "Emily Dickinson",
        bio: "American poet who lived a largely introverted life, known for her unique style of poetry.",
        password: await hashPassword("poet123")
      },
      {
        username: "walt_whitman",
        display_name: "Walt Whitman",
        bio: "American poet, essayist and journalist. A humanist, he was a part of the transition between transcendentalism and realism.",
        password: await hashPassword("poet123")
      }
    ];

    for (const poet of poets) {
      try {
        const [created] = await db
          .insert(users)
          .values(poet)
          .returning();
        console.log(`✓ Created poet user: ${created.username}`);
      } catch (error: any) {
        if (error.code === '23505') {
          console.log(`User ${poet.username} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    // Create events
    console.log("Creating poetry events...");
    const poetryEvents = [
      {
        title: "Annual Poetry in the Park",
        description: "Join us for a day of poetry readings and workshops in Central Park.",
        location: "Central Park, New York City",
        date: new Date("2024-05-15").toISOString(),
        created_by: adminId
      },
      {
        title: "Poetry Slam Championship",
        description: "Watch poets compete in our annual poetry slam competition.",
        location: "Chicago Cultural Center",
        date: new Date("2024-06-20").toISOString(),
        created_by: adminId
      },
      {
        title: "Verses & Vintages",
        description: "An evening of wine tasting and poetry reading.",
        location: "Napa Valley Vineyard",
        date: new Date("2024-07-10").toISOString(),
        created_by: adminId
      },
      {
        title: "Haiku Workshop",
        description: "Learn the art of writing haikus with master poets.",
        location: "Seattle Public Library",
        date: new Date("2024-08-05").toISOString(),
        created_by: adminId
      },
      {
        title: "Poetry & Jazz Festival",
        description: "Experience the fusion of poetry and jazz music.",
        location: "New Orleans Jazz Museum",
        date: new Date("2024-09-15").toISOString(),
        created_by: adminId
      },
      {
        title: "Spoken Word Night",
        description: "An evening dedicated to spoken word performances.",
        location: "The Poetry Cafe, London",
        date: new Date("2024-10-01").toISOString(),
        created_by: adminId
      },
      {
        title: "Children's Poetry Workshop",
        description: "Interactive poetry workshop for young aspiring poets.",
        location: "Boston Children's Museum",
        date: new Date("2024-11-12").toISOString(),
        created_by: adminId
      },
      {
        title: "Poetry & Nature Retreat",
        description: "A weekend retreat combining poetry and nature appreciation.",
        location: "Yosemite National Park",
        date: new Date("2024-12-05").toISOString(),
        created_by: adminId
      },
      {
        title: "Digital Poetry Exhibition",
        description: "Exploring the intersection of poetry and technology.",
        location: "San Francisco Museum of Modern Art",
        date: new Date("2025-01-20").toISOString(),
        created_by: adminId
      },
      {
        title: "International Poetry Festival",
        description: "Celebrating diverse poetic traditions from around the world.",
        location: "Edinburgh International Book Festival",
        date: new Date("2025-02-15").toISOString(),
        created_by: adminId
      }
    ];

    // Clear existing events first
    await db.delete(events);

    // Insert new events
    const insertedEvents = await db.insert(events).values(poetryEvents).returning();
    console.log("✓ Created poetry events");

    // Create points of interest
    console.log("Creating points of interest...");
    const pointsOfInterestData = [
      {
        title: "Emily Dickinson Museum",
        description: "Historic home and museum dedicated to the life and poetry of Emily Dickinson, featuring original artifacts, gardens, and interactive exhibits.",
        location: "280 Main St, Amherst, MA 01002",
        link: "https://www.emilydickinsonmuseum.org/",
        created_by: adminId
      },
      {
        title: "Walt Whitman Birthplace State Historic Site",
        description: "Preserved birthplace and interpretive center celebrating America's 'Bard of Democracy', featuring Whitman's writings and personal effects.",
        location: "246 Old Walt Whitman Rd, Huntington Station, NY 11746",
        link: "https://www.waltwhitman.org/",
        created_by: adminId
      },
      {
        title: "The Poetry Foundation",
        description: "Modern cultural center featuring a 30,000-volume poetry library, exhibition gallery, and performance space dedicated to poetry.",
        location: "61 W Superior St, Chicago, IL 60654",
        link: "https://www.poetryfoundation.org/",
        created_by: adminId
      },
      {
        title: "Shakespeare and Company",
        description: "Historic English-language bookstore in Paris, a gathering place for writers since 1919, featuring poetry readings and literary events.",
        location: "37 Rue de la Bûcherie, 75005 Paris, France",
        link: "https://shakespeareandcompany.com/",
        created_by: adminId
      },
      {
        title: "City Lights Bookstore",
        description: "Iconic independent bookstore and publisher, founded by poet Lawrence Ferlinghetti, a landmark of Beat Generation literature.",
        location: "261 Columbus Ave, San Francisco, CA 94133",
        link: "https://citylights.com/",
        created_by: adminId
      },
      {
        title: "Poets House",
        description: "Literary center with a 70,000-volume poetry collection, offering workshops, readings, and exhibitions in a serene riverside setting.",
        location: "10 River Terrace, New York, NY 10282",
        link: "https://poetshouse.org/",
        created_by: adminId
      },
      {
        title: "The Dylan Thomas Boathouse",
        description: "Writing studio and home of Welsh poet Dylan Thomas, offering stunning views of the Taf estuary that inspired his work.",
        location: "Dylan's Walk, Laugharne SA33 4SD, Wales",
        link: "https://www.dylanthomasboathouse.com/",
        created_by: adminId
      },
      {
        title: "The Poetry Cafe",
        description: "Vibrant venue of The Poetry Society, hosting regular poetry readings, slams, and workshops in the heart of London's Covent Garden.",
        location: "22 Betterton St, London WC2H 9BX, UK",
        link: "https://poetrysociety.org.uk/poetry-cafe/",
        created_by: adminId
      },
      {
        title: "Keats House",
        description: "Regency villa where Romantic poet John Keats wrote some of his most famous poems, now a museum celebrating his life and work.",
        location: "10 Keats Grove, Hampstead, London NW3 2RR, UK",
        link: "https://www.cityoflondon.gov.uk/things-to-do/keats-house",
        created_by: adminId
      },
      {
        title: "Gwendolyn Brooks' Bronzeville",
        description: "Historic Chicago neighborhood that inspired Pulitzer Prize-winning poet Gwendolyn Brooks, featuring literary landmarks and cultural sites.",
        location: "Bronzeville, Chicago, IL",
        link: "https://www.poetryfoundation.org/poets/gwendolyn-brooks",
        created_by: adminId
      }
    ];

    // Clear existing points of interest first
    await db.delete(pointsOfInterest);

    // Insert new points of interest
    await db.insert(pointsOfInterest).values(pointsOfInterestData);
    console.log("✓ Created points of interest");

    // Clear existing resources first
    await db.delete(resources);

    // Create resources
    console.log("Creating poetry resources...");
    const resourcesData = [
      {
        title: "Academy of American Poets",
        description: "Comprehensive resource for American poetry, including poems, poet biographies, and educational materials.",
        type: "Website",
        link: "https://poets.org/",
        created_by: adminId
      },
      {
        title: "Poetry Foundation",
        description: "Extensive collection of poems, articles, and podcasts about poetry.",
        type: "Website",
        link: "https://www.poetryfoundation.org/",
        created_by: adminId
      },
      {
        title: "The Poetry Archive",
        description: "World's premier online collection of recordings of poets reading their work.",
        type: "Digital Archive",
        link: "https://poetryarchive.org/",
        created_by: adminId
      },
      {
        title: "Poetry Society of America",
        description: "National organization dedicated to building a larger audience for poetry.",
        type: "Organization",
        link: "https://poetrysociety.org/",
        created_by: adminId
      },
      {
        title: "The Poetry School",
        description: "UK's largest provider of poetry education, offering courses and workshops.",
        type: "Educational",
        link: "https://poetryschool.com/",
        created_by: adminId
      },
      {
        title: "Poetry Daily",
        description: "Daily poetry readings and contemporary poetry news.",
        type: "Website",
        link: "https://poems.com/",
        created_by: adminId
      },
      {
        title: "Poetry Magazine",
        description: "Oldest monthly devoted to verse in the English-speaking world.",
        type: "Magazine",
        link: "https://www.poetryfoundation.org/poetrymagazine",
        created_by: adminId
      },
      {
        title: "Poets & Writers",
        description: "Largest nonprofit organization serving creative writers.",
        type: "Organization",
        link: "https://www.pw.org/",
        created_by: adminId
      },
      {
        title: "Poetry International Web",
        description: "Platform for international exchange of poetry.",
        type: "Website",
        link: "https://www.poetryinternational.org/",
        created_by: adminId
      },
      {
        title: "Button Poetry",
        description: "Digital platform promoting performance poetry.",
        type: "Digital Platform",
        link: "https://buttonpoetry.com/",
        created_by: adminId
      }
    ];

    await db.insert(resources).values(resourcesData);
    console.log("✓ Created resources");
    
    // Create followers table schema
    console.log("Creating followers table...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS followers (
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (follower_id, following_id)
      );
    `);
    console.log("✓ Created followers table");

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