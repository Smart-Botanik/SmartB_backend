import { PrismaClient } from "@prisma/client";

import { seedDevPlantEvents } from "./seed-dev-plant-events";

const prisma = new PrismaClient();

async function main() {
  const result = await seedDevPlantEvents(prisma);
  console.log(
    `seedDevPlantEvents: plant=${result.plantId} created=${result.created} skipped=${result.skipped}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
