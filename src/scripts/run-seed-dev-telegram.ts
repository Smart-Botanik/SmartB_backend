import {
  createContentPrisma,
  requireContentDatabaseUrl,
} from "./content-prisma-for-migration";
import { seedDevTelegramFromEnv } from "./seed-dev-telegram";

async function main() {
  const prisma = createContentPrisma(requireContentDatabaseUrl());
  try {
    const result = await seedDevTelegramFromEnv(prisma);
    console.log("Seeded dev Telegram from env → content_db (BK-TG-BOT-7):", result);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
