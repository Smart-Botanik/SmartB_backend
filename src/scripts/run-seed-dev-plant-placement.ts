import { PrismaClient } from "@prisma/client";
import { seedDevPlantPlacement } from "./seed-dev-plant-placement";

const prisma = new PrismaClient();

seedDevPlantPlacement(prisma)
  .then((result) => {
    console.log("Seeded dev plant placement (REW-06):", result);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
