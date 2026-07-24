"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const content_prisma_for_migration_1 = require("./content-prisma-for-migration");
const seed_dev_telegram_1 = require("./seed-dev-telegram");
async function main() {
    const prisma = (0, content_prisma_for_migration_1.createContentPrisma)((0, content_prisma_for_migration_1.requireContentDatabaseUrl)());
    try {
        const result = await (0, seed_dev_telegram_1.seedDevTelegramFromEnv)(prisma);
        console.log("Seeded dev Telegram from env → content_db (BK-TG-BOT-7):", result);
    }
    finally {
        await prisma.$disconnect();
    }
}
main().catch(error => {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=run-seed-dev-telegram.js.map