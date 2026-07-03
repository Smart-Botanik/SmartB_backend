import { PrismaClient } from "@prisma/client";
import { seedDevLocationGroups } from "./seed-dev-location-groups";

const prisma = new PrismaClient();

seedDevLocationGroups(prisma)
  .then((result) => {
    console.log("Seeded dev location groups (REW-04):", result);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
