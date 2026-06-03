import { PrismaClient } from "@prisma/client";
import { seedSiteContent } from "./seed-site-content";

const prisma = new PrismaClient();

async function main() {
  const result = await seedSiteContent(prisma);
  console.log("Site content seed complete:", result);
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
