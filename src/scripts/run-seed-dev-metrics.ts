import { PrismaClient } from "@prisma/client";
import { seedDevMetrics } from "./seed-dev-metrics";

const prisma = new PrismaClient();

seedDevMetrics(prisma)
  .then((result) => {
    console.log("Seeded dev metrics (REW-05):", result);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
