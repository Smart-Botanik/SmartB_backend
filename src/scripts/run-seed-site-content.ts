import { PrismaClient } from "@prisma/client";
import { seedSiteContent } from "./seed-site-content";

async function main() {
  const result = await seedSiteContent();
  console.log("Site content seed complete (content_db):", result);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
