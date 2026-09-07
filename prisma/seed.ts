import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type CategorySeed = {
  name: string;
  slug: string;
  sortOrder: number;
  parentSlug?: string;
};

type ColorSeed = {
  name: string;
  family: string;
  hexCode: string;
  sortOrder: number;
};

type SizeSeed = {
  name: string;
  category: string;
  sizeType: string;
  sortOrder: number;
};

async function main() {
  console.log("🌱 Seeding AR Fashions master catalog...");

  // =========================================================
  // 1. MAIN CATEGORIES
  // =========================================================

  const mainCategories: CategorySeed[] = [
    { name: "Women", slug: "women", sortOrder: 1 },
    { name: "Men", slug: "men", sortOrder: 2 },
    { name: "Kids", slug: "kids", sortOrder: 3 },
    { name: "Accessories", slug: "accessories", sortOrder: 4 },
  ];

  for (const category of mainCategories) {
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
        isActive: true,
      },
    });
  }

  // =========================================================
  // 2. WOMEN SUBCATEGORIES
  // =========================================================

  const womenCategories = [
    "Kurtis",
    "Kurtis Sets",
    "Tops",
    "T-Shirts",
    "Shirts",
    "Dresses",
    "Jeans",
    "Trousers",
    "Pants",
    "Palazzo",
    "Leggings",
    "Jeggings",
    "Skirts",
    "Shorts",
    "Co-ord Sets",
    "Sarees",
    "Dupattas",
    "Ethnic Wear",
    "Lehengas",
    "Salwar Suits",
    "Anarkali",
    "Gowns",
    "Jumpsuits",
    "Shrugs",
    "Jackets",
    "Sweatshirts",
    "Hoodies",
    "Blazers",
    "Nightwear",
    "Loungewear",
    "Innerwear",
  ];

  // =========================================================
  // 3. MEN SUBCATEGORIES
  // =========================================================

  const menCategories = [
    "T-Shirts",
    "Shirts",
    "Polo T-Shirts",
    "Jeans",
    "Trousers",
    "Formal Pants",
    "Casual Pants",
    "Cargo Pants",
    "Shorts",
    "Track Pants",
    "Joggers",
    "Kurtas",
    "Ethnic Wear",
    "Blazers",
    "Suits",
    "Jackets",
    "Sweatshirts",
    "Hoodies",
    "Sweaters",
    "Innerwear",
    "Nightwear",
    "Loungewear",
  ];

  // =========================================================
  // 4. KIDS SUBCATEGORIES
  // =========================================================

  const kidsCategories = [
    "Boys T-Shirts",
    "Boys Shirts",
    "Boys Jeans",
    "Boys Pants",
    "Boys Shorts",
    "Boys Joggers",
    "Boys Ethnic Wear",
    "Boys Jackets",
    "Boys Hoodies",
    "Boys Nightwear",

    "Girls Tops",
    "Girls T-Shirts",
    "Girls Dresses",
    "Girls Kurtis",
    "Girls Kurtis Sets",
    "Girls Jeans",
    "Girls Pants",
    "Girls Leggings",
    "Girls Palazzo",
    "Girls Skirts",
    "Girls Shorts",
    "Girls Ethnic Wear",
    "Girls Lehengas",
    "Girls Gowns",
    "Girls Jackets",
    "Girls Hoodies",
    "Girls Nightwear",

    "Baby Boys",
    "Baby Girls",
    "Kids Co-ord Sets",
    "Kids Party Wear",
    "Kids Casual Wear",
    "Kids School Wear",
  ];

  // =========================================================
  // 5. ACCESSORIES
  // =========================================================

  const accessoryCategories = [
    "Bags",
    "Handbags",
    "Backpacks",
    "Wallets",
    "Belts",
    "Caps",
    "Hats",
    "Sunglasses",
    "Scarves",
    "Hair Accessories",
    "Jewellery",
    "Watches",
    "Socks",
  ];

  const categoryGroups = [
    {
      parentSlug: "women",
      names: womenCategories,
      startOrder: 100,
    },
    {
      parentSlug: "men",
      names: menCategories,
      startOrder: 200,
    },
    {
      parentSlug: "kids",
      names: kidsCategories,
      startOrder: 300,
    },
    {
      parentSlug: "accessories",
      names: accessoryCategories,
      startOrder: 400,
    },
  ];

  for (const group of categoryGroups) {
    const parent = await prisma.category.findUnique({
      where: { slug: group.parentSlug },
    });

    if (!parent) {
      throw new Error(
        `Parent category not found: ${group.parentSlug}`,
      );
    }

    for (let i = 0; i < group.names.length; i++) {
      const name = group.names[i];

      const slug = `${group.parentSlug}-${name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")}`;

      await prisma.category.upsert({
        where: { slug },
        update: {
          name,
          parentId: parent.id,
          sortOrder: group.startOrder + i,
          isActive: true,
        },
        create: {
          name,
          slug,
          parentId: parent.id,
          sortOrder: group.startOrder + i,
          isActive: true,
        },
      });
    }
  }

  // =========================================================
  // 6. COMPLETE COLOUR MASTER
  // =========================================================

  const colors: ColorSeed[] = [
    // Neutrals
    { name: "Black", family: "Black", hexCode: "#000000", sortOrder: 1 },
    { name: "Jet Black", family: "Black", hexCode: "#0A0A0A", sortOrder: 2 },
    { name: "Charcoal", family: "Black", hexCode: "#36454F", sortOrder: 3 },

    { name: "White", family: "White", hexCode: "#FFFFFF", sortOrder: 4 },
    { name: "Off White", family: "White", hexCode: "#FAF9F6", sortOrder: 5 },
    { name: "Ivory", family: "White", hexCode: "#FFFFF0", sortOrder: 6 },
    { name: "Cream", family: "White", hexCode: "#FFFDD0", sortOrder: 7 },

    { name: "Grey", family: "Grey", hexCode: "#808080", sortOrder: 8 },
    { name: "Light Grey", family: "Grey", hexCode: "#D3D3D3", sortOrder: 9 },
    { name: "Dark Grey", family: "Grey", hexCode: "#555555", sortOrder: 10 },
    { name: "Silver", family: "Grey", hexCode: "#C0C0C0", sortOrder: 11 },

    { name: "Beige", family: "Brown", hexCode: "#F5F5DC", sortOrder: 12 },
    { name: "Tan", family: "Brown", hexCode: "#D2B48C", sortOrder: 13 },
    { name: "Brown", family: "Brown", hexCode: "#8B4513", sortOrder: 14 },
    { name: "Coffee", family: "Brown", hexCode: "#6F4E37", sortOrder: 15 },
    { name: "Chocolate", family: "Brown", hexCode: "#7B3F00", sortOrder: 16 },

    // Red
    { name: "Red", family: "Red", hexCode: "#FF0000", sortOrder: 20 },
    { name: "Bright Red", family: "Red", hexCode: "#FF1A1A", sortOrder: 21 },
    { name: "Cherry Red", family: "Red", hexCode: "#D2042D", sortOrder: 22 },
    { name: "Brick Red", family: "Red", hexCode: "#CB4154", sortOrder: 23 },
    { name: "Rust", family: "Red", hexCode: "#B7410E", sortOrder: 24 },
    { name: "Maroon", family: "Red", hexCode: "#800000", sortOrder: 25 },
    { name: "Wine", family: "Red", hexCode: "#722F37", sortOrder: 26 },
    { name: "Burgundy", family: "Red", hexCode: "#800020", sortOrder: 27 },

    // Pink
    { name: "Baby Pink", family: "Pink", hexCode: "#F4C2C2", sortOrder: 30 },
    { name: "Light Pink", family: "Pink", hexCode: "#FFB6C1", sortOrder: 31 },
    { name: "Pink", family: "Pink", hexCode: "#FFC0CB", sortOrder: 32 },
    { name: "Hot Pink", family: "Pink", hexCode: "#FF69B4", sortOrder: 33 },
    { name: "Rose", family: "Pink", hexCode: "#FF007F", sortOrder: 34 },
    { name: "Magenta", family: "Pink", hexCode: "#FF00FF", sortOrder: 35 },
    { name: "Fuchsia", family: "Pink", hexCode: "#FF00AA", sortOrder: 36 },

    // Orange / Peach
    { name: "Orange", family: "Orange", hexCode: "#FFA500", sortOrder: 40 },
    { name: "Dark Orange", family: "Orange", hexCode: "#FF8C00", sortOrder: 41 },
    { name: "Peach", family: "Orange", hexCode: "#FFE5B4", sortOrder: 42 },
    { name: "Coral", family: "Orange", hexCode: "#FF7F50", sortOrder: 43 },
    { name: "Terracotta", family: "Orange", hexCode: "#E2725B", sortOrder: 44 },

    // Yellow / Gold
    { name: "Yellow", family: "Yellow", hexCode: "#FFFF00", sortOrder: 50 },
    { name: "Lemon Yellow", family: "Yellow", hexCode: "#FFF44F", sortOrder: 51 },
    { name: "Mustard", family: "Yellow", hexCode: "#FFDB58", sortOrder: 52 },
    { name: "Golden", family: "Yellow", hexCode: "#FFD700", sortOrder: 53 },

    // Green
    { name: "Green", family: "Green", hexCode: "#008000", sortOrder: 60 },
    { name: "Light Green", family: "Green", hexCode: "#90EE90", sortOrder: 61 },
    { name: "Dark Green", family: "Green", hexCode: "#006400", sortOrder: 62 },
    { name: "Bottle Green", family: "Green", hexCode: "#006A4E", sortOrder: 63 },
    { name: "Olive", family: "Green", hexCode: "#808000", sortOrder: 64 },
    { name: "Mint Green", family: "Green", hexCode: "#98FF98", sortOrder: 65 },
    { name: "Sage Green", family: "Green", hexCode: "#9CAF88", sortOrder: 66 },
    { name: "Sea Green", family: "Green", hexCode: "#2E8B57", sortOrder: 67 },
    { name: "Emerald Green", family: "Green", hexCode: "#50C878", sortOrder: 68 },

    // Blue
    { name: "Blue", family: "Blue", hexCode: "#0000FF", sortOrder: 70 },
    { name: "Sky Blue", family: "Blue", hexCode: "#87CEEB", sortOrder: 71 },
    { name: "Baby Blue", family: "Blue", hexCode: "#89CFF0", sortOrder: 72 },
    { name: "Royal Blue", family: "Blue", hexCode: "#4169E1", sortOrder: 73 },
    { name: "Navy Blue", family: "Blue", hexCode: "#000080", sortOrder: 74 },
    { name: "Denim Blue", family: "Blue", hexCode: "#1560BD", sortOrder: 75 },
    { name: "Teal", family: "Blue", hexCode: "#008080", sortOrder: 76 },
    { name: "Aqua", family: "Blue", hexCode: "#00FFFF", sortOrder: 77 },
    { name: "Turquoise", family: "Blue", hexCode: "#40E0D0", sortOrder: 78 },

    // Purple
    { name: "Purple", family: "Purple", hexCode: "#800080", sortOrder: 80 },
    { name: "Violet", family: "Purple", hexCode: "#8F00FF", sortOrder: 81 },
    { name: "Lavender", family: "Purple", hexCode: "#E6E6FA", sortOrder: 82 },
    { name: "Lilac", family: "Purple", hexCode: "#C8A2C8", sortOrder: 83 },
    { name: "Plum", family: "Purple", hexCode: "#673147", sortOrder: 84 },

    // Metallic / special
    { name: "Rose Gold", family: "Metallic", hexCode: "#B76E79", sortOrder: 90 },
    { name: "Copper", family: "Metallic", hexCode: "#B87333", sortOrder: 91 },
    { name: "Bronze", family: "Metallic", hexCode: "#CD7F32", sortOrder: 92 },
  ];

  for (const color of colors) {
    await prisma.color.upsert({
      where: { name: color.name },
      update: {
        family: color.family,
        hexCode: color.hexCode,
        isActive: true,
        sortOrder: color.sortOrder,
      },
      create: {
        name: color.name,
        family: color.family,
        hexCode: color.hexCode,
        isActive: true,
        sortOrder: color.sortOrder,
      },
    });
  }

  // =========================================================
  // 7. SIZE MASTER
  // =========================================================

  const sizes: SizeSeed[] = [
    // Universal clothing
    {
      name: "Free Size",
      category: "Clothing",
      sizeType: "GENERAL",
      sortOrder: 1,
    },

    // Adult clothing
    {
      name: "XS",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 10,
    },
    {
      name: "S",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 11,
    },
    {
      name: "M",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 12,
    },
    {
      name: "L",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 13,
    },
    {
      name: "XL",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 14,
    },
    {
      name: "XXL",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 15,
    },
    {
      name: "3XL",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 16,
    },
    {
      name: "4XL",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 17,
    },
    {
      name: "5XL",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 18,
    },
    {
      name: "6XL",
      category: "Adult",
      sizeType: "LETTER",
      sortOrder: 19,
    },

    // Numeric fashion sizes
    {
      name: "26",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 30,
    },
    {
      name: "28",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 31,
    },
    {
      name: "30",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 32,
    },
    {
      name: "32",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 33,
    },
    {
      name: "34",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 34,
    },
    {
      name: "36",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 35,
    },
    {
      name: "38",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 36,
    },
    {
      name: "40",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 37,
    },
    {
      name: "42",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 38,
    },
    {
      name: "44",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 39,
    },
    {
      name: "46",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 40,
    },
    {
      name: "48",
      category: "Adult",
      sizeType: "NUMERIC",
      sortOrder: 41,
    },

    // Kids age sizes
    {
      name: "0-3M",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 50,
    },
    {
      name: "3-6M",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 51,
    },
    {
      name: "6-9M",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 52,
    },
    {
      name: "9-12M",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 53,
    },
    {
      name: "1-2Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 54,
    },
    {
      name: "2-3Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 55,
    },
    {
      name: "3-4Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 56,
    },
    {
      name: "4-5Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 57,
    },
    {
      name: "5-6Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 58,
    },
    {
      name: "6-7Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 59,
    },
    {
      name: "7-8Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 60,
    },
    {
      name: "8-9Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 61,
    },
    {
      name: "9-10Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 62,
    },
    {
      name: "10-11Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 63,
    },
    {
      name: "11-12Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 64,
    },
    {
      name: "12-13Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 65,
    },
    {
      name: "13-14Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 66,
    },
    {
      name: "14-15Y",
      category: "Kids",
      sizeType: "AGE",
      sortOrder: 67,
    },
  ];

  for (const size of sizes) {
    await prisma.size.upsert({
      where: { name: size.name },
      update: {
        category: size.category,
        sizeType: size.sizeType,
        isActive: true,
        sortOrder: size.sortOrder,
      },
      create: {
        name: size.name,
        category: size.category,
        sizeType: size.sizeType,
        isActive: true,
        sortOrder: size.sortOrder,
      },
    });
  }

  // =========================================================
  // 8. SALES MODE
  // =========================================================

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

  // =========================================================
  // SUMMARY
  // =========================================================

  const categoryCount = await prisma.category.count();
  const colorCount = await prisma.color.count();
  const sizeCount = await prisma.size.count();

  console.log("");
  console.log("======================================");
  console.log("🎉 AR FASHIONS MASTER CATALOG READY");
  console.log("======================================");
  console.log(`📂 Categories : ${categoryCount}`);
  console.log(`🎨 Colours    : ${colorCount}`);
  console.log(`📏 Sizes      : ${sizeCount}`);
  console.log("🛍️ Retail     : OPEN");
  console.log("📦 Reseller   : OPEN");
  console.log("======================================");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
