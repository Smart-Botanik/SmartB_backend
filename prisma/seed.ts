import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // Create admin users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const moderatorPassword = await bcrypt.hash("moderator123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@growingapp.com" },
    update: {},
    create: {
      email: "admin@growingapp.com",
      username: "admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const admin2 = await prisma.user.upsert({
    where: { email: "admin2@growingapp.com" },
    update: {},
    create: {
      email: "admin2@growingapp.com",
      username: "admin2",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const moderator = await prisma.user.upsert({
    where: { email: "moderator@growingapp.com" },
    update: {},
    create: {
      email: "moderator@growingapp.com",
      username: "moderator",
      passwordHash: moderatorPassword,
      role: "MODERATOR",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@growingapp.com" },
    update: {},
    create: {
      email: "user@growingapp.com",
      username: "user",
      passwordHash: userPassword,
      role: "USER",
    },
  });

  console.log("Created users:", { admin, admin2, moderator, user });

  // Create some sample brands
  const brand1 = await prisma.brand.create({
    data: {
      name: "GrowLight Pro",
      category: "LAMP",
      summarize: "Professional LED grow lights for indoor cultivation",
    },
  });

  const brand2 = await prisma.brand.create({
    data: {
      name: "TentMaster",
      category: "TENT",
      summarize: "High-quality grow tents in various sizes",
    },
  });

  const brand3 = await prisma.brand.create({
    data: {
      name: "Breeders Choice",
      category: "BREADER",
      summarize: "Premium genetics and seeds collection",
    },
  });

  console.log("Created brands:", { brand1, brand2, brand3 });

  // Create some sample products
  await prisma.product.createMany({
    data: [
      {
        name: "LED Grow Light 300W",
        category: "Lighting",
        brandId: brand1.id,
        summarize: "Full spectrum LED grow light with 300W power",
      },
      {
        name: "LED Grow Light 600W",
        category: "Lighting",
        brandId: brand1.id,
        summarize: "Professional full spectrum LED grow light with 600W power",
      },
      {
        name: "Grow Tent 120x120x200cm",
        category: "Tents",
        brandId: brand2.id,
        summarize: "Medium size grow tent with reflective interior",
      },
      {
        name: "Grow Tent 240x120x200cm",
        category: "Tents",
        brandId: brand2.id,
        summarize: "Large professional grow tent for serious growers",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created sample products");

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
