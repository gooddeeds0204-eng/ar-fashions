import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding AR Fashions database...");

  // -------------------------
  // Categories
  // -------------------------

  const categories = [
    {
      name: "Women",
      slug: "women",
      sortOrder: 1,
    },
    {
      name: "Men",
      slug: "men",
      sortOrder: 2,
    },
    {
      name: "Kids",
      slug: "kids",
      sortOrder: 3,
    },
    {
      name: "Accessories",
      slug: "accessories",
      sortOrder: 4,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
      },
    });
  }

  // -------------------------
  // Default Colors
  // -------------------------

  const colors = [
    ["Black", "#000000"],
    ["White", "#FFFFFF"],
    ["Red", "#FF0000"],
    ["Blue", "#0000FF"],
    ["Green", "#008000"],
    ["Pink", "#FFC0CB"],
    ["Yellow", "#FFFF00"],
    ["Maroon", "#800000"],
    ["Wine", "#722F37"],
    ["Beige", "#F5F5DC"],
    ["Brown", "#8B4513"],
    ["Grey", "#808080"],
    ["Navy", "#000080"],
    ["Orange", "#FFA500"],
    ["Purple", "#800080"],
  ];

  for (let i = 0; i < colors.length; i++) {
    const [name, hexCode] = colors[i];

    await prisma.color.upsert({
      where: { name },
      update: {
        hexCode,
        isActive: true,
        sortOrder: i + 1,
      },
      create: {
        name,
        hexCode,
        sortOrder: i + 1,
      },
    });
  }

  // -------------------------
  // Default Sizes
  // -------------------------

  const sizes = [
    ["XS", "Clothing"],
    ["S", "Clothing"],
    ["M", "Clothing"],
    ["L", "Clothing"],
    ["XL", "Clothing"],
    ["XXL", "Clothing"],
    ["XXXL", "Clothing"],
  ];

  for (let i = 0; i < sizes.length; i++) {
    const [name, category] = sizes[i];

    await prisma.size.upsert({
      where: { name },
      update: {
        category,
        isActive: true,
        sortOrder: i + 1,
      },
      create: {
        name,
        category,
        sortOrder: i + 1,
      },
    });
  }

  // -------------------------
  // Sales Modes
  // -------------------------

  const existingSalesMode = await prisma.salesMode.findFirst();

  if (!existingSalesMode) {
    await prisma.salesMode.create({
      data: {
        retailStatus: "OPEN",
        resellerStatus: "OPEN",
        retailMessage: "Retail shopping is open.",
        resellerMessage: "Reseller orders are open.",
      },
    });
  } else {
    await prisma.salesMode.update({
      where: { id: existingSalesMode.id },
      data: {
        retailStatus: "OPEN",
        resellerStatus: "OPEN",
      },
    });
  }

  console.log("✅ Categories seeded");
  console.log("✅ Colors seeded");
  console.log("✅ Sizes seeded");
  console.log("✅ Sales modes seeded");
  console.log("🎉 AR Fashions seed completed successfully!");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
