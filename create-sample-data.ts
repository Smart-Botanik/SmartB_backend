import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createSampleData() {
  try {
    console.log("🌱 Creating sample data for dashboard...");

    // Create sample brands
    const brands = await Promise.all([
      prisma.brand.upsert({
        where: { id: "brand-greenthumb" },
        update: {},
        create: {
          id: "brand-greenthumb",
          name: "GreenThumb",
          category: "HOME",
          summarize: "Premium gardening tools and supplies",
        },
      }),
      prisma.brand.upsert({
        where: { id: "brand-plantpro" },
        update: {},
        create: {
          id: "brand-plantpro",
          name: "PlantPro",
          category: "HOME",
          summarize: "Professional plant care products",
        },
      }),
      prisma.brand.upsert({
        where: { id: "brand-ecogrow" },
        update: {},
        create: {
          id: "brand-ecogrow",
          name: "EcoGrow",
          category: "HOME",
          summarize: "Sustainable gardening solutions",
        },
      }),
    ]);

    // Create sample products
    const products = await Promise.all([
      prisma.product.upsert({
        where: { id: "product-soil" },
        update: {},
        create: {
          id: "product-soil",
          name: "Organic Soil Mix",
          category: "HOME",
          brandId: brands[0].id,
          summarize: "Premium organic potting mix for indoor plants",
        },
      }),
      prisma.product.upsert({
        where: { id: "product-fertilizer" },
        update: {},
        create: {
          id: "product-fertilizer",
          name: "Plant Fertilizer",
          category: "HOME",
          brandId: brands[1].id,
          summarize: "All-purpose liquid fertilizer",
        },
      }),
      prisma.product.upsert({
        where: { id: "product-tools" },
        update: {},
        create: {
          id: "product-tools",
          name: "Garden Tools Set",
          category: "HOME",
          brandId: brands[2].id,
          summarize: "Complete set of essential gardening tools",
        },
      }),
    ]);

    // Get existing users and create sample plants/diaries
    const users = await prisma.user.findMany({
      take: 3,
    });

    if (users.length > 0) {
      // Create sample plants
      for (let i = 0; i < Math.min(5, users.length); i++) {
        await prisma.plant.upsert({
          where: { id: `plant-${i}` },
          update: {},
          create: {
            id: `plant-${i}`,
            name: `Sample Plant ${i + 1}`,
            userId: users[i % users.length].id,
            summarize: `A beautiful sample plant for testing purposes`,
          },
        });
      }

      // Create sample diaries
      for (let i = 0; i < Math.min(3, users.length); i++) {
        await prisma.diary.upsert({
          where: { id: `diary-${i}` },
          update: {},
          create: {
            id: `diary-${i}`,
            title: `My Garden Diary ${i + 1}`,
            body: `This is a sample diary entry about my gardening journey. Day ${i + 1} of growing amazing plants!`,
            userId: users[i % users.length].id,
            summarize: `Sample diary entry about gardening experiences`,
          },
        });
      }
    }

    // Get final counts
    const stats = await prisma.$transaction([
      prisma.user.count(),
      prisma.plant.count(),
      prisma.diary.count(),
      prisma.brand.count(),
      prisma.product.count(),
      prisma.media.count(),
    ]);

    console.log("✅ Sample data created successfully!");
    console.log("📊 Current Statistics:");
    console.log(`   Users: ${stats[0]}`);
    console.log(`   Plants: ${stats[1]}`);
    console.log(`   Diaries: ${stats[2]}`);
    console.log(`   Brands: ${stats[3]}`);
    console.log(`   Products: ${stats[4]}`);
    console.log(`   Media: ${stats[5]}`);
    console.log("");
    console.log(
      "🌐 View the updated dashboard at: http://localhost:3001/admin",
    );
  } catch (error) {
    console.error("❌ Error creating sample data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createSampleData();
