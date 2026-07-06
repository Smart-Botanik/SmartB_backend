import { PrismaClient } from "@prisma/client";
import { seedDevTelegramFromEnv } from "./seed-dev-telegram";

const prisma = new PrismaClient();

seedDevTelegramFromEnv(prisma)
  .then((result) => {
    console.log("Seeded dev Telegram from env (BK-TG-BOT-7):", result);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
